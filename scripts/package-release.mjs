import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export async function inventory(directory, prefix = '') {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Release cannot contain symlink ${relative}`);
    if (entry.isDirectory())
      result.push(
        ...(await inventory(path.join(directory, entry.name), relative)),
      );
    else result.push(relative);
  }
  return result.sort();
}
export async function packageRelease(
  root,
  output,
  { allowDirty = false } = {},
) {
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const dirty = Boolean(git('status', '--porcelain'));
  if (dirty && !allowDirty)
    throw new Error(
      'Commit or preserve local changes before packaging a release; --allow-dirty is for local verification only',
    );
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'ftd-release-'));
  try {
    for (const [source, target] of [
      ['dist', 'html'],
      ['app/dist', 'app/dist'],
      ['app/package.json', 'app/package.json'],
      ['app/package-lock.json', 'app/package-lock.json'],
      ['public/resources', 'public/resources'],
      ['config/nginx.conf', 'config/nginx.conf.example'],
      ['config/ftdcare.env.example', 'config/ftdcare.env.example'],
      ['config/ftdcare.service', 'config/ftdcare.service.example'],
      ['docs/deployment.md', 'DEPLOYMENT.md'],
    ]) {
      await fs.mkdir(path.dirname(path.join(stage, target)), {
        recursive: true,
      });
      await fs.cp(path.join(root, source), path.join(stage, target), {
        recursive: true,
      });
    }
    const policy = JSON.parse(
      await fs.readFile(path.join(root, 'package.json'), 'utf8'),
    ).allowScripts;
    if (policy) {
      const manifestPath = path.join(stage, 'app/package.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      manifest.allowScripts = policy;
      await fs.writeFile(
        manifestPath,
        JSON.stringify(manifest, null, 2) + '\n',
      );
    }
    for (const required of [
      'html/index.html',
      'app/dist/server.js',
      'app/dist/db/migrate.js',
      'app/dist/preflight.js',
    ])
      await fs.access(path.join(stage, required));
    const html = await fs.readFile(path.join(stage, 'html/index.html'), 'utf8');
    const assets = [
      ...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g),
    ].map((match) => match[1]);
    if (!assets.some((file) => file.endsWith('.js')))
      throw new Error('No built frontend JavaScript entry found');
    for (const asset of assets)
      await fs.access(path.join(stage, 'html', asset.slice(1)));
    await fs.writeFile(
      path.join(stage, 'release.json'),
      JSON.stringify(
        {
          commit: git('rev-parse', 'HEAD'),
          dirty,
          node: process.version,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ) + '\n',
    );
    const files = await inventory(stage);
    const forbidden = files.find(
      (file) =>
        /(?:^|\/)(?:uploads|node_modules)(?:\/|$)/.test(file) ||
        /(?:^|\/)\.env(?:\.|$)/.test(file),
    );
    if (forbidden)
      throw new Error(
        `Private/runtime content found in release output: ${forbidden}; clean and rebuild`,
      );
    const directories = new Set([stage]);
    for (const file of files) {
      let directory = path.dirname(path.join(stage, file));
      while (directory !== stage) {
        directories.add(directory);
        directory = path.dirname(directory);
      }
    }
    for (const directory of directories) await fs.chmod(directory, 0o755);
    const sums = [];
    for (const file of files) {
      const target = path.join(stage, file);
      await fs.chmod(target, 0o644);
      sums.push(
        createHash('sha256')
          .update(await fs.readFile(target))
          .digest('hex') +
          '  ' +
          file,
      );
    }
    await fs.writeFile(path.join(stage, 'SHA256SUMS'), sums.join('\n') + '\n');
    await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
    execFileSync('tar', ['-czf', path.resolve(output), '-C', stage, '.']);
    return {
      commit: git('rev-parse', 'HEAD'),
      dirty,
      files: files.length,
      output: path.resolve(output),
    };
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const output = args.find((arg) => !arg.startsWith('--'));
  if (!output)
    throw new Error(
      'Usage: npm run release:package -- /path/release.tgz [--allow-dirty]',
    );
  const root = fileURLToPath(new URL('../', import.meta.url));
  process.stdout.write(
    JSON.stringify(
      await packageRelease(root, output, {
        allowDirty: args.includes('--allow-dirty'),
      }),
    ) + '\n',
  );
}
