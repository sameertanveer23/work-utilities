export interface Quote {
  readonly text: string;
  readonly author: string;
}

/** Bundled rather than fetched, so the quote works offline like the rest of the app. */
export const QUOTES: readonly Quote[] = [
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  { text: 'Simplicity is prerequisite for reliability.', author: 'Edsger W. Dijkstra' },
  {
    text: 'Programs must be written for people to read, and only incidentally for machines to execute.',
    author: 'Harold Abelson',
  },
  {
    text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
    author: 'Martin Fowler',
  },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  {
    text: 'There are only two hard things in Computer Science: cache invalidation and naming things.',
    author: 'Phil Karlton',
  },
  { text: 'Controlling complexity is the essence of computer programming.', author: 'Brian Kernighan' },
  {
    text: 'Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.',
    author: 'Antoine de Saint-Exupéry',
  },
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  { text: 'Simple things should be simple, complex things should be possible.', author: 'Alan Kay' },
  { text: 'Code is like humor. When you have to explain it, it’s bad.', author: 'Cory House' },
  { text: 'Before software can be reusable it first has to be usable.', author: 'Ralph Johnson' },
  { text: 'Plan to throw one away; you will, anyhow.', author: 'Fred Brooks' },
  { text: 'Adding manpower to a late software project makes it later.', author: 'Fred Brooks' },
  {
    text: 'The function of good software is to make the complex appear to be simple.',
    author: 'Grady Booch',
  },
  { text: 'Deleted code is debugged code.', author: 'Jeff Sickel' },
  {
    text: 'The cheapest, fastest, and most reliable components are those that aren’t there.',
    author: 'Gordon Bell',
  },
  {
    text: 'Walking on water and developing software from a specification are easy if both are frozen.',
    author: 'Edward V. Berard',
  },
  { text: 'Software is eating the world.', author: 'Marc Andreessen' },
];

/**
 * Days since the epoch in the user's own calendar, so the quote rolls over at
 * local midnight rather than at UTC midnight.
 */
export function localDayNumber(date: Date): number {
  return Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86_400_000,
  );
}

/** The same quote all day; `offset` steps through the list for "another one". */
export function quoteFor(date: Date, offset = 0): Quote {
  const n = QUOTES.length;
  return QUOTES[(((localDayNumber(date) + offset) % n) + n) % n];
}
