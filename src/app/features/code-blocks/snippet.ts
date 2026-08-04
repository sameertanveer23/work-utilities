/** Shape of every JSON file in ./snippets/. `id` is derived from the filename. */
export interface Snippet {
  readonly id: string;
  readonly title: string;
  readonly language: string;
  readonly code: string;
  readonly tags?: readonly string[];
}
