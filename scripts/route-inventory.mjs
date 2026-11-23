import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
export async function routeInventory(root = process.cwd()) {
  const found = new Set();
  const visited = new Set();
  async function visit(file, prefix = '') {
    const key = file + '|' + prefix;
    if (visited.has(key)) return;
    visited.add(key);
    const source = ts.createSourceFile(
      file,
      await fs.readFile(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const imports = new Map();
    for (const statement of source.statements)
      if (
        ts.isImportDeclaration(statement) &&
        statement.importClause?.name &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text.startsWith('.')
      )
        imports.set(
          statement.importClause.name.text,
          path.resolve(
            path.dirname(file),
            statement.moduleSpecifier.text.replace(/\.js$/, '.ts'),
          ),
        );
    const mounts = [];
    function walk(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ['app', 'router'].includes(node.expression.expression.getText(source))
      ) {
        const method = node.expression.name.text;
        const first = node.arguments[0];
        if (
          ['get', 'post', 'put', 'patch', 'delete'].includes(method) &&
          first &&
          ts.isStringLiteral(first)
        ) {
          const route = (prefix + '/' + first.text)
            .replace(/\/+/g, '/')
            .replace(/\/$/, '');
          if (route.startsWith('/api/v1/'))
            found.add(method.toUpperCase() + ' ' + route);
        }
        if (method === 'use') {
          const mount = first && ts.isStringLiteral(first) ? first.text : '';
          for (const arg of node.arguments)
            if (ts.isIdentifier(arg) && imports.has(arg.text))
              mounts.push([
                imports.get(arg.text),
                (prefix + '/' + mount).replace(/\/+/g, '/').replace(/\/$/, ''),
              ]);
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
    for (const [next, prefix] of mounts) await visit(next, prefix);
  }
  await visit(path.join(root, 'app/src/app.ts'));
  return [...found].sort();
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
)
  process.stdout.write((await routeInventory()).join('\n') + '\n');
