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
  {
    text: 'Controlling complexity is the essence of computer programming.',
    author: 'Brian Kernighan',
  },
  {
    text: 'Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.',
    author: 'Antoine de Saint-Exupéry',
  },
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  {
    text: 'Simple things should be simple, complex things should be possible.',
    author: 'Alan Kay',
  },
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
  { text: 'The fuck are you doing? Aren`t you suppose to work?', author: 'Sameer Tanveer' },
  {
    text: 'It works on my machine.',
    author: 'The Developer Who Broke Production',
  },
  {
    text: '99 little bugs in the code, 99 little bugs. Take one down, patch it around, 127 little bugs in the code.',
    author: 'Every Developer Ever',
  },
  {
    text: 'My code doesn’t have bugs. It develops random features.',
    author: 'Optimistic Developer',
  },
  {
    text: 'There are only two hard things in programming: cache invalidation, naming things, and off-by-one errors.',
    author: 'Anonymous',
  },
  {
    text: 'Why did the developer go broke? Because he used up all his cache.',
    author: 'Dad Joke.exe',
  },
  {
    text: 'The best way to learn a new framework is to build something and regret your architecture later.',
    author: 'Every Senior Developer',
  },
  {
    text: 'Behind every successful developer is a search history they hope nobody sees.',
    author: 'Anonymous',
  },
  {
    text: 'The code you write today is the legacy code you’ll complain about next year.',
    author: 'Future You',
  },
  {
    text: 'Stay curious. The moment you think you know everything, JavaScript releases another feature.',
    author: 'Frontend Developer',
  },
  {
    text: 'A good developer solves problems. A great developer prevents tomorrow’s problems.',
    author: 'Engineering Wisdom',
  },
  {
    text: 'No matter what you do..AI will take your job one day.',
    author: 'The Harsh truth',
  },
];

/**
 * A random index that is never `previous`, so a refresh always shows a different
 * quote. `random` is injectable (returns [0, 1)) to keep this testable.
 */
export function pickQuoteIndex(count: number, previous: number | null, random = Math.random): number {
  if (count <= 1) return 0;
  if (previous === null || previous < 0 || previous >= count) return Math.floor(random() * count);
  // Draw from the other count-1 slots, then skip over the one we're avoiding.
  const index = Math.floor(random() * (count - 1));
  return index >= previous ? index + 1 : index;
}
