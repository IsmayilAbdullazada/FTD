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
export async function cleanupUploads(
  directory = uploadsDirectory,
): Promise<void> {
  try {
    const files = await fs.readdir(directory).catch(() => []);
    for (const name of files) {
      if (!/^guide_[a-zA-Z0-9_.-]+\.pdf$/i.test(name)) continue;
      const file = path.join(directory, name);
      const stat = await fs.stat(file);
      if (Date.now() - stat.mtimeMs < 86400000) continue;
      const url = '/uploads/guides/' + name;
      const referenced = await query(
        'SELECT 1 FROM chatbot_guides WHERE pdf_url=$1 UNION ALL SELECT 1 FROM resources WHERE file_attachment_url=$1 LIMIT 1',
        [url],
      );
      if (referenced.rowCount) continue;
      await fs.unlink(file);
      await query('DELETE FROM guide_uploads WHERE storage_name=$1', [name]);
    }
  } catch (error) {
    logger.error('Upload cleanup failed', error);
  }
}
