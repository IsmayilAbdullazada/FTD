import { env } from '../config/env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '../config/db.js';
import { logger } from '../lib/logger.js';
export const uploadsDirectory =
  env.GUIDE_UPLOAD_DIRECTORY ??
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../public/uploads/guides',
  );
const validName = (name: string) => /^guide_[a-zA-Z0-9_.-]+\.pdf$/i.test(name);
export async function agedOrphanUploads(
  directory = uploadsDirectory,
  limit = 200,
) {
  const result: Array<{
    storage_name: string;
    uploaded_by: string | null;
    created_at: Date;
    _file_mtime: number;
    _file_bytes: number;
  }> = [];
  const files = await fs.readdir(directory).catch(() => []);
  for (const name of files) {
    if (!validName(name)) continue;
    const stat = await fs.lstat(path.join(directory, name)).catch(() => null);
    if (!stat?.isFile() || Date.now() - stat.mtimeMs < 86400000) continue;
    const referenced = await query(
      'SELECT 1 FROM chatbot_guides WHERE pdf_url=$1 UNION ALL SELECT 1 FROM resources WHERE file_attachment_url=$1 LIMIT 1',
      ['/uploads/guides/' + name],
    );
    if (referenced.rowCount) continue;
    const registered = (
      await query(
        'SELECT uploaded_by,created_at FROM guide_uploads WHERE storage_name=$1',
        [name],
      )
    ).rows[0];
    result.push({
      storage_name: name,
      uploaded_by: registered?.uploaded_by || null,
      created_at: registered?.created_at || stat.mtime,
      _file_mtime: stat.mtimeMs,
      _file_bytes: stat.size,
    });
    if (result.length >= limit) break;
  }
  return result;
}
export async function cleanupUploads(
  directory = uploadsDirectory,
  approvedNames?: string[],
): Promise<{ removed: string[]; failed: boolean }> {
  const removed: string[] = [];
  try {
    const files =
      approvedNames?.slice(0, 200) ??
      (await agedOrphanUploads(directory)).map((file) => file.storage_name);
    for (const name of files) {
      if (!validName(name)) continue;
      const file = path.join(directory, name);
      const stat = await fs.lstat(file).catch(() => null);
      if (stat && (!stat.isFile() || Date.now() - stat.mtimeMs < 86400000))
        continue;
      const referenced = await query(
        'SELECT 1 FROM chatbot_guides WHERE pdf_url=$1 UNION ALL SELECT 1 FROM resources WHERE file_attachment_url=$1 LIMIT 1',
        ['/uploads/guides/' + name],
      );
      if (referenced.rowCount) continue;
      if (stat) await fs.unlink(file);
      await query('DELETE FROM guide_uploads WHERE storage_name=$1', [name]);
      removed.push(name);
    }
  } catch (error) {
    logger.error('Upload cleanup failed', error);
    return { removed, failed: true };
  }
  return { removed, failed: false };
}
