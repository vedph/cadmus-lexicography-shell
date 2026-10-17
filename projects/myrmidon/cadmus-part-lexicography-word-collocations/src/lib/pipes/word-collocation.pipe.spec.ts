import { WordCollocation } from '../lex-word-collocations-part';
import { WordCollocationPipe } from './word-collocation.pipe';

describe('WordCollocationPipe', () => {
  const pipe = new WordCollocationPipe();
  const collocation: WordCollocation = {
    rank: 1,
    tokens: [{ pos: 'a', isHead: false }, { pos: 'n', isHead: true }],
    examples: [
      { tokenNr: 1, literals: [{ value: 'strong' }] },
      { tokenNr: 2, literals: [{ value: 'tea' }] },
    ],
  };

  it('should return an empty string for no value', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should format a collocation', () => {
    expect(pipe.transform(collocation)).toBe('(1) a+<n>: [strong] <tea>');
  });

  it('should format a collocation using labels for POS IDs', () => {
    expect(pipe.transform(collocation, { ADJ: 'a', NOUN: 'n' })).toBe(
      '(1) ADJ+<NOUN>: [strong] <tea>',
    );
  });

  it('should return an empty string for a malformed collocation', () => {
    expect(pipe.transform({ tokens: undefined } as unknown as WordCollocation)).toBe('');
  });
});
