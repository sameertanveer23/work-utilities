import type { Type } from '@angular/core';
import type { CategoryId } from './categories';

export interface UtilityDef {
  /** Stable key used for favorites and recents storage. Never change it. */
  readonly id: string;
  /** Route path, without a leading slash. */
  readonly path: string;
  /** Full name, shown in the page header and browser title. */
  readonly title: string;
  /** Compact name for the sidebar. */
  readonly shortTitle: string;
  readonly description: string;
  /** Material Symbols ligature. */
  readonly icon: string;
  readonly category: CategoryId;
  /** Extra terms the sidebar filter and command palette match against. */
  readonly keywords: readonly string[];
  readonly loadComponent: () => Promise<Type<unknown>>;
}

/**
 * The single source of truth for navigation. This array drives the routes, the
 * sidebar, the command palette, the welcome grid and the page titles - adding a
 * utility means writing the component and appending one entry here.
 */
export const UTILITIES: readonly UtilityDef[] = [
  {
    id: 'in-generator',
    path: 'sql/in-generator',
    title: 'SQL IN Statement Generator',
    shortTitle: 'IN Generator',
    description: 'Turn a list of IDs into a SELECT ... WHERE ... IN (...) query.',
    icon: 'database',
    category: 'sql',
    keywords: ['sql', 'in', 'query', 'select', 'where', 'ids', 'list'],
    loadComponent: () =>
      import('../features/in-generator/in-generator').then((m) => m.InGenerator),
  },
  {
    id: 'guid-generator',
    path: 'dotnet/guid-generator',
    title: 'GUID Generator',
    shortTitle: 'GUID Generator',
    description: 'Generate v4 GUIDs in bulk, with casing and brace options.',
    icon: 'fingerprint',
    category: 'dotnet',
    keywords: ['guid', 'uuid', 'id', 'random', 'identifier', 'v4'],
    loadComponent: () =>
      import('../features/guid-generator/guid-generator').then((m) => m.GuidGenerator),
  },
  {
    id: 'branch-name-generator',
    path: 'general/branch-name',
    title: 'Branch Name Generator',
    shortTitle: 'Branch Names',
    description: 'Build a git branch name from a card number and title.',
    icon: 'account_tree',
    category: 'general',
    keywords: ['git', 'branch', 'slug', 'checkout', 'card', 'ticket', 'jira'],
    loadComponent: () =>
      import('../features/branch-name-generator/branch-name-generator').then(
        (m) => m.BranchNameGenerator,
      ),
  },
  {
    id: 'color-filter',
    path: 'css/color-filter',
    title: 'CSS Color Filter Generator',
    shortTitle: 'Color Filter',
    description: 'Find the CSS filter chain that recolors a black icon to any color.',
    icon: 'palette',
    category: 'css',
    keywords: [
      'css',
      'filter',
      'color',
      'colour',
      'svg',
      'icon',
      'tint',
      'recolor',
      'hex',
      'invert',
      'sepia',
      'hue-rotate',
    ],
    loadComponent: () =>
      import('../features/color-filter/color-filter').then((m) => m.ColorFilter),
  },
  {
    id: 'json-formatter',
    path: 'general/json-formatter',
    title: 'JSON Formatter',
    shortTitle: 'JSON Formatter',
    description: 'Pretty-print, minify and validate JSON with error positions.',
    icon: 'data_object',
    category: 'general',
    keywords: ['json', 'format', 'pretty', 'beautify', 'minify', 'validate', 'parse'],
    loadComponent: () =>
      import('../features/json-formatter/json-formatter').then((m) => m.JsonFormatter),
  },
  {
    id: 'encoder',
    path: 'general/encoder',
    title: 'Encode / Decode',
    shortTitle: 'Encode / Decode',
    description: 'Base64, URL and HTML entity encoding, both directions.',
    icon: 'swap_horiz',
    category: 'general',
    keywords: ['base64', 'url', 'encode', 'decode', 'escape', 'html', 'entities', 'uri'],
    loadComponent: () => import('../features/encoder/encoder').then((m) => m.Encoder),
  },
  {
    id: 'timestamp-converter',
    path: 'general/timestamp',
    title: 'Timestamp Converter',
    shortTitle: 'Timestamps',
    description: 'Convert between Unix epoch, ISO 8601 and local time.',
    icon: 'schedule',
    category: 'general',
    keywords: ['timestamp', 'epoch', 'unix', 'date', 'time', 'iso', 'utc', 'convert'],
    loadComponent: () =>
      import('../features/timestamp-converter/timestamp-converter').then(
        (m) => m.TimestampConverter,
      ),
  },
  {
    id: 'code-blocks',
    path: 'snippets/code-blocks',
    title: 'Frequently Used Code Blocks',
    shortTitle: 'Frequently Used',
    description: 'Your saved snippets, searchable and one click from the clipboard.',
    icon: 'content_paste',
    category: 'snippets',
    keywords: ['snippet', 'code', 'block', 'sql', 'migration', 'ngrok', 'copy'],
    loadComponent: () =>
      import('../features/code-blocks/code-blocks').then((m) => m.CodeBlocks),
  },
];

const BY_ID = new Map(UTILITIES.map((u) => [u.id, u]));

export function utilityById(id: string): UtilityDef | undefined {
  return BY_ID.get(id);
}

export function utilitiesInCategory(category: CategoryId): UtilityDef[] {
  return UTILITIES.filter((u) => u.category === category);
}

/**
 * Matches a utility against a free-text query. Scores title matches above
 * keyword matches so the palette ranks the obvious answer first; returns 0 for
 * no match.
 */
export function scoreUtility(utility: UtilityDef, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const title = utility.title.toLowerCase();
  const short = utility.shortTitle.toLowerCase();

  if (title === q || short === q) return 100;
  if (title.startsWith(q) || short.startsWith(q)) return 80;
  if (title.includes(q) || short.includes(q)) return 60;
  if (utility.keywords.some((k) => k.startsWith(q))) return 40;
  if (utility.keywords.some((k) => k.includes(q))) return 30;
  if (utility.description.toLowerCase().includes(q)) return 20;
  if (isSubsequence(q, title)) return 10;
  return 0;
}

/** Loose "brnm" -> "branch name" style matching, used as the last resort. */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const char of haystack) {
    if (char === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return i === needle.length;
}
