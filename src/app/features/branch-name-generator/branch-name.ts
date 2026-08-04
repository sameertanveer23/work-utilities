export const BRANCH_PREFIXES = ['', 'feature/', 'bugfix/', 'hotfix/', 'release/'] as const;
export type BranchPrefix = (typeof BRANCH_PREFIXES)[number];

/** Ported verbatim from the original tool - the output must not drift. */
export function slugifyBranchTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/['‘’]/g, '') // drop straight and smart apostrophes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeCardNumber(card: string): string {
  return card
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

export function buildBranchName(prefix: string, card: string, title: string): string {
  const parts = [normalizeCardNumber(card.trim()), slugifyBranchTitle(title.trim())].filter(Boolean);
  return parts.length === 0 ? '' : prefix + parts.join('-');
}
