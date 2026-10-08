// Builds src/assets/fonts/material-symbols-subset.woff2: the Material Symbols
// font cut down to only the icons the app actually uses.
//
// The full font is ~3.9 MB (every icon, all four variable axes) and blocks every
// icon on every page until it has downloaded; the subset is ~10 kB.
//
// How it finds icons: every quoted lowercase token in src/**/*.{ts,html} is tried
// against the font itself, and the ones that turn into an icon glyph are kept.
// That covers `name="star"`, registry `icon:` fields and ternaries like
// `copied() ? 'check' : 'content_copy'`, and it includes legacy aliases such as
// `expand_more` that the package's name list (index.d.ts) leaves out. Words that
// merely happen to be icon names (e.g. 'close' in prose) just add a glyph.
//
// A name in `icon: '...'` or `name="..."` that is NOT an icon fails the build, so
// a typo can't ship as the literal word.
//
// Runs automatically via the `prestart` / `prebuild` npm hooks; run it by hand
// with `npm run icons`. The output is committed so a bare `ng build` works.
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import subsetFont from 'subset-font';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const sourceFont = join(root, 'node_modules/material-symbols/material-symbols-outlined.woff2');
const outFile = join(root, 'src/assets/fonts/material-symbols-subset.woff2');

// An icon is a ligature: the glyph is reached by typing its name, so the letters
// that spell names must stay in the font alongside the icon glyphs themselves.
const LIGATURE_LETTERS = 'abcdefghijklmnopqrstuvwxyz0123456789_';

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.(ts|html)$/.test(entry) && !/\.spec\.ts$/.test(entry)) yield path;
  }
}

const candidates = new Set(); // any quoted lowercase word
const declared = new Map(); // names in `icon:` / `name=` positions -> file, for typo detection
for (const file of sourceFiles(srcDir)) {
  const text = readFileSync(file, 'utf8');
  for (const [, token] of text.matchAll(/['"`]([a-z][a-z0-9_]*)['"`]/g)) candidates.add(token);
  const declaredPattern = file.endsWith('.html')
    ? /<app-icon[^>]*?\bname="([a-z][a-z0-9_]*)"/g
    : /\bicon: '([a-z][a-z0-9_]*)'/g;
  for (const [, token] of text.matchAll(declaredPattern)) declared.set(token, file);
}

const sourceBuffer = readFileSync(sourceFont);
const source = fontkit.create(sourceBuffer);

/** The single glyph a name turns into, or null if the font doesn't ligate it. */
function iconGlyph(font, name) {
  const { glyphs } = font.layout(name);
  return glyphs.length === 1 && glyphs[0].id !== 0 ? glyphs[0] : null;
}

// A ligature glyph has no codepoint of its own (its `codePoints` are just the
// letters of its name), but every icon is also mapped to a private-use character.
// The subsetter selects glyphs by codepoint, so find that character per glyph.
const puaByGlyphId = new Map();
for (const cp of source.characterSet) {
  if (cp >= 0xe000 && cp <= 0xf8ff) puaByGlyphId.set(source.glyphForCodePoint(cp).id, cp);
}

const used = new Set();
const codepoints = new Set();
for (const name of [...candidates].sort()) {
  const glyph = iconGlyph(source, name);
  const cp = glyph && puaByGlyphId.get(glyph.id);
  if (cp) {
    used.add(name);
    codepoints.add(cp);
  }
}

const unknown = [...declared].filter(([name]) => !used.has(name));
if (unknown.length > 0) {
  console.error('icon font: not a Material Symbols icon (typo?):');
  for (const [name, file] of unknown) console.error(`  ${name}  (${file.replace(root, '')})`);
  process.exit(1);
}

const text = LIGATURE_LETTERS + String.fromCodePoint(...codepoints);
const subset = await subsetFont(sourceBuffer, text, {
  targetFormat: 'woff2',
  // Without this the subsetter keeps every ligature whose letters are present,
  // i.e. the whole icon set again.
  noLayoutClosure: true,
  // The app only ever uses the default (outlined, regular weight) style.
  variationAxes: { FILL: 0, GRAD: 0, wght: 400, opsz: 24 },
});

// Fail the build rather than ship an icon that renders as its raw name.
const check = fontkit.create(subset);
const broken = [...used].filter((name) => !iconGlyph(check, name));
if (broken.length > 0) {
  console.error(`icon font: subset lost icons: ${broken.join(', ')}`);
  process.exit(1);
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, subset);
console.log(
  `material-symbols-subset.woff2: ${used.size} icon(s), ${(subset.length / 1024).toFixed(1)} kB ` +
    `(was ${(sourceBuffer.length / 1024).toFixed(0)} kB)`,
);
