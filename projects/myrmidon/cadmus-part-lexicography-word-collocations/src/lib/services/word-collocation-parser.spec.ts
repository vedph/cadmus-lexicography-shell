import { WordCollocationParser } from './word-collocation-parser';

describe('WordCollocationParser', () => {
  describe('parse', () => {
    it('should parse basic collocation with rank', () => {
      const input = '(1) <NOUN>+VERB: la <Prefettura> [applica, decide, emette (provvedimenti)]';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toBeUndefined();
      expect(result.value.length).toBe(1);

      const collocation = result.value[0];
      expect(collocation.rank).toBe(1);
      expect(collocation.tokens.length).toBe(2);
      expect(collocation.tokens[0].pos).toBe('NOUN');
      expect(collocation.tokens[0].isHead).toBe(true);
      expect(collocation.tokens[1].pos).toBe('VERB');

      expect(collocation.examples?.length).toBe(3);
      expect(collocation.examples![0].tokenNr).toBe(0);
      expect(collocation.examples![0].literals[0].value).toBe('la');

      expect(collocation.examples![1].tokenNr).toBe(1);
      expect(collocation.examples![1].literals[0].value).toBe('Prefettura');

      expect(collocation.examples![2].tokenNr).toBe(2);
      expect(collocation.examples![2].literals.length).toBe(3);
      expect(collocation.examples![2].literals[0].value).toBe('applica');
      expect(collocation.examples![2].literals[1].value).toBe('decide');
      expect(collocation.examples![2].literals[2].value).toBe('emette');
      expect(collocation.examples![2].literals[2].note).toBe('provvedimenti');
    });

    it('should parse collocation without rank', () => {
      const input = '<ADJ>+NOUN: strong <tea>';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toBeUndefined();
      expect(result.value.length).toBe(1);
      expect(result.value[0].rank).toBeUndefined();
      expect(result.value[0].tokens.length).toBe(2);
    });

    it('should parse collocation with token notes', () => {
      const input = '<NOUN (substantive)>+VERB (action): example';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toBeUndefined();
      expect(result.value[0].tokens[0].note).toBe('substantive');
      expect(result.value[0].tokens[1].note).toBe('action');
    });

    it('should parse collocation with head literal note', () => {
      const input = '<NOUN>+VERB: <Prefettura (government)> acts';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toBeUndefined();
      expect(result.value[0].examples![0].literals[0].value).toBe('Prefettura');
      expect(result.value[0].examples![0].literals[0].note).toBe('government');
    });

    it('should parse multiple simple literals', () => {
      const input = '<NOUN>+VERB: the quick brown <fox> [jumps]';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toBeUndefined();
      const examples = result.value[0].examples!;
      expect(examples[0].tokenNr).toBe(0);
      expect(examples[0].literals[0].value).toBe('the');
      expect(examples[1].tokenNr).toBe(0);
      expect(examples[1].literals[0].value).toBe('quick');
      expect(examples[2].tokenNr).toBe(0);
      expect(examples[2].literals[0].value).toBe('brown');
    });

    it('should parse collocation without examples', () => {
      const input = '<NOUN>+VERB:';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toBeUndefined();
      expect(result.value[0].examples).toBeUndefined();
    });

    it('should parse multiple collocations', () => {
      const input = `(1) <NOUN>+VERB: <tea> [is]
(2) <ADJ>+NOUN: strong <coffee>`;
      const result = WordCollocationParser.parse(input);

      expect(result.error).toBeUndefined();
      expect(result.value.length).toBe(2);
      expect(result.value[0].rank).toBe(1);
      expect(result.value[1].rank).toBe(2);
    });

    it('should handle empty input', () => {
      const result = WordCollocationParser.parse('');
      expect(result.error).toBe('Input text is empty');
      expect(result.value.length).toBe(0);
    });

    it('should report error for missing colon', () => {
      const input = '<NOUN>+VERB example';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toContain("Missing ':' separator");
    });

    it('should report error for no head token', () => {
      const input = 'NOUN+VERB: example';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toContain('No head token found');
    });

    it('should report error for multiple head tokens', () => {
      const input = '<NOUN>+<VERB>: example';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toContain('Multiple head tokens found');
    });

    it('should report error for unclosed bracket', () => {
      const input = '<NOUN+VERB: example';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toContain("Unclosed '<'");
    });

    it('should parse three-token collocation', () => {
      const input = '<NOUN>+ADJ+VERB: <house> [big, small] [is, was]';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toBeUndefined();
      expect(result.value[0].tokens.length).toBe(3);
      expect(result.value[0].examples?.length).toBe(3);
    });

    it('should handle whitespace variations', () => {
      const input = '  (1)   <NOUN>  +  VERB  :   <tea>   [is]  ';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toBeUndefined();
      expect(result.value[0].rank).toBe(1);
    });

    it('should parse single alternative literal', () => {
      const input = '<NOUN>+VERB: <tea> [is]';
      const result = WordCollocationParser.parse(input);

      expect(result.error).toBeUndefined();
      expect(result.value[0].examples![1].literals.length).toBe(1);
      expect(result.value[0].examples![1].literals[0].value).toBe('is');
    });

    it('should report line number in multi-line errors', () => {
      const input = `(1) <NOUN>+VERB: valid
NOUN+VERB: invalid
(3) <ADJ>+NOUN: valid`;
      const result = WordCollocationParser.parse(input);

      expect(result.error).toContain('Line 2');
      expect(result.value.length).toBe(2); // Two valid entries
    });

    // Tests with label-to-ID mapping
    it('should parse collocation with label-to-ID mapping', () => {
      const input = '<NOUN>+VERB: <tea> [is]';
      const labelToIdMap = {
        NOUN: 'n',
        VERB: 'v',
      };
      const result = WordCollocationParser.parse(input, labelToIdMap);

      expect(result.error).toBeUndefined();
      expect(result.value[0].tokens[0].pos).toBe('n');
      expect(result.value[0].tokens[1].pos).toBe('v');
    });

    it('should use label as-is when not in mapping', () => {
      const input = '<NOUN>+ADJECTIVE: <tea> [strong]';
      const labelToIdMap = {
        NOUN: 'n',
      };
      const result = WordCollocationParser.parse(input, labelToIdMap);

      expect(result.error).toBeUndefined();
      expect(result.value[0].tokens[0].pos).toBe('n');
      expect(result.value[0].tokens[1].pos).toBe('ADJECTIVE');
    });

    it('should map labels with notes', () => {
      const input = '<NOUN (substantive)>+VERB (action): example';
      const labelToIdMap = {
        NOUN: 'n',
        VERB: 'v',
      };
      const result = WordCollocationParser.parse(input, labelToIdMap);

      expect(result.error).toBeUndefined();
      expect(result.value[0].tokens[0].pos).toBe('n');
      expect(result.value[0].tokens[0].note).toBe('substantive');
      expect(result.value[0].tokens[1].pos).toBe('v');
      expect(result.value[0].tokens[1].note).toBe('action');
    });

    it('should map labels in complex collocation', () => {
      const input = '(1) <NOUN>+VERB: la <Prefettura> [applica, decide, emette (provvedimenti)]';
      const labelToIdMap = {
        NOUN: 'n',
        VERB: 'v',
      };
      const result = WordCollocationParser.parse(input, labelToIdMap);

      expect(result.error).toBeUndefined();
      expect(result.value[0].tokens[0].pos).toBe('n');
      expect(result.value[0].tokens[1].pos).toBe('v');
    });

    it('should map multiple collocations with different POS', () => {
      const input = `<NOUN>+VERB: <tea> [is]
<ADJ>+NOUN: strong <coffee>`;
      const labelToIdMap = {
        NOUN: 'n',
        VERB: 'v',
        ADJ: 'a',
      };
      const result = WordCollocationParser.parse(input, labelToIdMap);

      expect(result.error).toBeUndefined();
      expect(result.value[0].tokens[0].pos).toBe('n');
      expect(result.value[0].tokens[1].pos).toBe('v');
      expect(result.value[1].tokens[0].pos).toBe('a');
      expect(result.value[1].tokens[1].pos).toBe('n');
    });
  });

  describe('toString', () => {
    it('should convert basic collocation to string', () => {
      const collocation = {
        rank: 1,
        tokens: [{ pos: 'NOUN', isHead: true }, { pos: 'VERB' }],
        examples: [
          { tokenNr: 0, literals: [{ value: 'la' }] },
          { tokenNr: 1, literals: [{ value: 'Prefettura' }] },
          {
            tokenNr: 2,
            literals: [
              { value: 'applica' },
              { value: 'decide' },
              { value: 'emette', note: 'provvedimenti' },
            ],
          },
        ],
      };

      const result = WordCollocationParser.toString(collocation);
      expect(result).toBe(
        '(1) <NOUN>+VERB: la <Prefettura> [applica, decide, emette (provvedimenti)]'
      );
    });

    it('should convert collocation without rank', () => {
      const collocation = {
        tokens: [{ pos: 'ADJ', isHead: true }, { pos: 'NOUN' }],
      };

      const result = WordCollocationParser.toString(collocation);
      expect(result).toBe('<ADJ>+NOUN:');
    });

    it('should convert collocation with token notes', () => {
      const collocation = {
        tokens: [
          { pos: 'NOUN', isHead: true, note: 'substantive' },
          { pos: 'VERB', note: 'action' },
        ],
      };

      const result = WordCollocationParser.toString(collocation);
      expect(result).toBe('<NOUN (substantive)>+VERB (action):');
    });

    it('should convert collocation with head literal note', () => {
      const collocation = {
        tokens: [{ pos: 'NOUN', isHead: true }, { pos: 'VERB' }],
        examples: [
          {
            tokenNr: 1,
            literals: [{ value: 'Prefettura', note: 'government' }],
          },
        ],
      };

      const result = WordCollocationParser.toString(collocation);
      expect(result).toBe('<NOUN>+VERB: <Prefettura (government)>');
    });

    it('should handle round-trip conversion', () => {
      const original = '(1) <NOUN>+VERB: la <Prefettura> [applica, decide, emette (provvedimenti)]';
      const parsed = WordCollocationParser.parse(original);
      const converted = WordCollocationParser.toString(parsed.value[0]);

      expect(converted).toBe(original);
    });

    // Tests with label-to-ID mapping
    it('should convert collocation with ID-to-label mapping', () => {
      const collocation = {
        rank: 1,
        tokens: [{ pos: 'n', isHead: true }, { pos: 'v' }],
        examples: [
          { tokenNr: 0, literals: [{ value: 'la' }] },
          { tokenNr: 1, literals: [{ value: 'Prefettura' }] },
          {
            tokenNr: 2,
            literals: [
              { value: 'applica' },
              { value: 'decide' },
              { value: 'emette', note: 'provvedimenti' },
            ],
          },
        ],
      };
      const labelToIdMap = {
        NOUN: 'n',
        VERB: 'v',
      };

      const result = WordCollocationParser.toString(collocation, labelToIdMap);
      expect(result).toBe(
        '(1) <NOUN>+VERB: la <Prefettura> [applica, decide, emette (provvedimenti)]'
      );
    });

    it('should use ID as-is when not in mapping', () => {
      const collocation = {
        tokens: [{ pos: 'n', isHead: true }, { pos: 'unknown' }],
      };
      const labelToIdMap = {
        NOUN: 'n',
      };

      const result = WordCollocationParser.toString(collocation, labelToIdMap);
      expect(result).toBe('<NOUN>+unknown:');
    });

    it('should map IDs with notes', () => {
      const collocation = {
        tokens: [
          { pos: 'n', isHead: true, note: 'substantive' },
          { pos: 'v', note: 'action' },
        ],
      };
      const labelToIdMap = {
        NOUN: 'n',
        VERB: 'v',
      };

      const result = WordCollocationParser.toString(collocation, labelToIdMap);
      expect(result).toBe('<NOUN (substantive)>+VERB (action):');
    });

    it('should handle round-trip conversion with mapping', () => {
      const original = '(1) <NOUN>+VERB: la <Prefettura> [applica, decide]';
      const labelToIdMap = {
        NOUN: 'n',
        VERB: 'v',
      };
      const parsed = WordCollocationParser.parse(original, labelToIdMap);
      const converted = WordCollocationParser.toString(parsed.value[0], labelToIdMap);

      expect(converted).toBe(original);
      expect(parsed.value[0].tokens[0].pos).toBe('n');
      expect(parsed.value[0].tokens[1].pos).toBe('v');
    });

    it('should convert multiple tokens with mixed mapping', () => {
      const collocation = {
        tokens: [{ pos: 'n', isHead: true }, { pos: 'a' }, { pos: 'PREP' }],
      };
      const labelToIdMap = {
        NOUN: 'n',
        ADJ: 'a',
      };

      const result = WordCollocationParser.toString(collocation, labelToIdMap);
      expect(result).toBe('<NOUN>+ADJ+PREP:');
    });

    it('should preserve original format when no mapping provided', () => {
      const collocation = {
        rank: 2,
        tokens: [{ pos: 'n', isHead: true }, { pos: 'v' }],
        examples: [{ tokenNr: 1, literals: [{ value: 'test' }] }],
      };

      const result = WordCollocationParser.toString(collocation);
      expect(result).toBe('(2) <n>+v: <test>');
    });

    it('should convert alternatives with notes', () => {
      const result = WordCollocationParser.toString({
        tokens: [{ pos: 'ADJ' }, { pos: 'NOUN', isHead: true }],
        examples: [
          { tokenNr: 0, literals: [{ value: 'un' }] },
          { tokenNr: 1, literals: [{ value: 'forte', note: 'f.' }] },
          {
            tokenNr: 2,
            literals: [{ value: 'tè', note: 'n.' }, { value: 'caffè' }],
          },
        ],
      });
      expect(result).toBe('ADJ+<NOUN>: un [forte (f.)] [tè (n.), caffè]');
    });
  });

  describe('parse edge cases', () => {
    it('should report an empty token', () => {
      const result = WordCollocationParser.parse('<NOUN>++VERB: x');
      expect(result.value).toEqual([]);
      expect(result.error).toContain('Empty token');
    });

    it('should report missing tokens before the colon', () => {
      const result = WordCollocationParser.parse(': x');
      expect(result.error).toContain("No tokens found before ':'");
    });

    it('should parse a head token with a note after its brackets', () => {
      const result = WordCollocationParser.parse('<NOUN> (subject)+VERB:');
      expect(result.error).toBeUndefined();
      expect(result.value[0].tokens[0]).toEqual({ pos: 'NOUN', isHead: true, note: 'subject' });
    });

    it('should parse optional alternatives ignoring their marker', () => {
      const result = WordCollocationParser.parse('<NOUN>+ADJ: <tè> [? forte, nero]');
      expect(result.error).toBeUndefined();
      expect(result.value[0].examples![1].literals).toEqual([{ value: 'forte' }, { value: 'nero' }]);
    });

    it('should parse alternative literals with notes', () => {
      const result = WordCollocationParser.parse('<NOUN>+ADJ: <tè> [forte (f.), nero]');
      expect(result.value[0].examples![1].literals).toEqual([
        { value: 'forte', note: 'f.' },
        { value: 'nero' },
      ]);
    });

    it('should keep valid lines when other lines have errors', () => {
      const result = WordCollocationParser.parse('<NOUN>+ADJ: <tè>\nbad line');
      expect(result.value.length).toBe(1);
      expect(result.error).toBe(`Line 2: Missing ':' separator in "bad line"`);
    });

    it('should round-trip a complex collocation', () => {
      const text = '(3) ADJ (qual.)+<NOUN>: un [forte (f.), nero] <tè (n.)> caldo';
      const parsed = WordCollocationParser.parse(text);
      expect(parsed.error).toBeUndefined();
      expect(WordCollocationParser.toString(parsed.value[0])).toBe(text);
    });
  });
});
