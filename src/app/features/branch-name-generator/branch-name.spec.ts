import { describe, expect, it } from 'vitest';
import { buildBranchName, normalizeCardNumber, slugifyBranchTitle } from './branch-name';

describe('slugifyBranchTitle', () => {
  it('lowercases and dash-joins words', () => {
    expect(slugifyBranchTitle('Fix the study filter')).toBe('fix-the-study-filter');
  });

  it('strips diacritics rather than dropping the letters', () => {
    expect(slugifyBranchTitle('Café résumé')).toBe('cafe-resume');
  });

  it('removes apostrophes without leaving a dash behind', () => {
    expect(slugifyBranchTitle("Patient's navigator")).toBe('patients-navigator');
    expect(slugifyBranchTitle('Patient’s navigator')).toBe('patients-navigator');
  });

  it('collapses runs of punctuation and trims edge dashes', () => {
    expect(slugifyBranchTitle('  ...Hello -- World!!  ')).toBe('hello-world');
  });

  it('returns an empty string when nothing survives', () => {
    expect(slugifyBranchTitle('!!!')).toBe('');
  });
});

describe('normalizeCardNumber', () => {
  it('uppercases and keeps hyphens', () => {
    expect(normalizeCardNumber('ap-3961')).toBe('AP-3961');
  });

  it('turns spaces into hyphens and drops other punctuation', () => {
    expect(normalizeCardNumber('AP 3961#')).toBe('AP-3961');
  });
});

describe('buildBranchName', () => {
  it('joins the prefix, card and slug', () => {
    expect(buildBranchName('feature/', 'AP-3961', 'Fix the filter')).toBe(
      'feature/AP-3961-fix-the-filter',
    );
  });

  it('works with no prefix', () => {
    expect(buildBranchName('', 'AP-3961', 'Fix')).toBe('AP-3961-fix');
  });

  it('omits an empty card number', () => {
    expect(buildBranchName('bugfix/', '', 'Fix the filter')).toBe('bugfix/fix-the-filter');
  });

  it('omits an empty title', () => {
    expect(buildBranchName('bugfix/', 'AP-1', '')).toBe('bugfix/AP-1');
  });

  it('returns nothing at all when both parts are empty', () => {
    expect(buildBranchName('feature/', '', '')).toBe('');
  });
});
