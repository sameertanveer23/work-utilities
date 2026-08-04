export type CategoryId = 'sql' | 'dotnet' | 'angular' | 'css' | 'general' | 'snippets';

export interface CategoryDef {
  readonly id: CategoryId;
  readonly label: string;
  /** Material Symbols ligature. */
  readonly icon: string;
}

/** Sidebar group order. A category with no utilities simply isn't rendered. */
export const CATEGORIES: readonly CategoryDef[] = [
  { id: 'sql', label: 'SQL', icon: 'database' },
  { id: 'dotnet', label: '.NET', icon: 'deployed_code' },
  { id: 'angular', label: 'Angular', icon: 'web' },
  { id: 'css', label: 'CSS', icon: 'palette' },
  { id: 'general', label: 'General', icon: 'handyman' },
  { id: 'snippets', label: 'Code Blocks', icon: 'content_paste' },
];
