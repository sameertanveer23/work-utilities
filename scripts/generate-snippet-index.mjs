// Generates src/app/features/code-blocks/snippets.index.ts from every *.json
// file in the snippets/ folder, so adding a snippet is "drop in a JSON file".
//
// Runs automatically via the `prestart` / `prebuild` npm hooks; run it by hand
// with `npm run snippets`.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snippetsDir = join(root, 'src/app/features/code-blocks/snippets');
const outFile = join(root, 'src/app/features/code-blocks/snippets.index.ts');

const files = readdirSync(snippetsDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

const entries = [];
const problems = [];

for (const file of files) {
  const id = basename(file, '.json');
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(join(snippetsDir, file), 'utf8'));
  } catch (err) {
    problems.push(`${file}: not valid JSON (${err.message})`);
    continue;
  }
  for (const key of ['title', 'language', 'code']) {
    if (typeof parsed[key] !== 'string' || parsed[key].length === 0) {
      problems.push(`${file}: missing or empty required string field "${key}"`);
    }
  }
  if (parsed.tags !== undefined && !Array.isArray(parsed.tags)) {
    problems.push(`${file}: optional field "tags" must be an array of strings`);
  }
  entries.push({ id, file, ident: toIdent(id) });
}

if (problems.length > 0) {
  console.error('Snippet validation failed:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

function toIdent(id) {
  const camel = id.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  return /^[a-zA-Z_$]/.test(camel) ? camel : '_' + camel;
}

const banner = `// GENERATED FILE - DO NOT EDIT.
// Produced by scripts/generate-snippet-index.mjs from ./snippets/*.json.
// Add a snippet by dropping a JSON file in ./snippets/ - no registry edit needed.
`;

const imports = entries
  .map((e) => `import ${e.ident} from './snippets/${e.file}';`)
  .join('\n');

const list = entries
  .map((e) => `  { id: '${e.id}', ...${e.ident} } as Snippet,`)
  .join('\n');

writeFileSync(
  outFile,
  `${banner}
import type { Snippet } from './snippet';

${imports}

export const SNIPPETS: readonly Snippet[] = [
${list}
];
`,
  'utf8',
);

console.log(`snippets.index.ts: ${entries.length} snippet(s)`);
