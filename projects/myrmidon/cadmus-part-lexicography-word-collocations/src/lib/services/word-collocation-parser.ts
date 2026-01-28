import {
  WordCollocation,
  WordCollocationToken,
  WordCollocationExampleToken,
  WordCollocationLiteral,
} from '../lex-word-collocations-part';

export interface ResultWrapper<T> {
  value: T;
  error?: string;
}

/**
 * A parser for word collocations.
 */
export class WordCollocationParser {
  /**
   * Parse multiple collocations from text (one per line).
   * @param text The text to parse.
   * @param labelToIdMap Optional map from labels to IDs for POS values.
   */
  static parse(
    text: string,
    labelToIdMap?: { [key: string]: string }
  ): ResultWrapper<WordCollocation[]> {
    if (!text?.trim()) {
      return { value: [], error: 'Input text is empty' };
    }

    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const collocations: WordCollocation[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const collocation = this.parseSingle(lines[i], labelToIdMap);
        collocations.push(collocation);
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      value: collocations,
      error: errors.length > 0 ? errors.join('\n') : undefined,
    };
  }

  /**
   * Parse a single collocation from a line.
   * @param line The line to parse.
   * @param labelToIdMap Optional map from labels to IDs for POS values.
   */
  private static parseSingle(
    line: string,
    labelToIdMap?: { [key: string]: string }
  ): WordCollocation {
    let index = 0;
    const original = line;

    // Parse rank (optional)
    const rank = this.parseRank(line);
    if (rank !== undefined) {
      const rankMatch = line.match(/^\(\d+\)\s*/);
      if (rankMatch) {
        index = rankMatch[0].length;
        line = line.substring(index);
      }
    }

    // Parse tokens (required, ends with :)
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Missing ':' separator in "${original}"`);
    }

    const tokensStr = line.substring(0, colonIndex).trim();
    const examplesStr = line.substring(colonIndex + 1).trim();

    if (!tokensStr) {
      throw new Error(`No tokens found before ':' in "${original}"`);
    }

    const tokens = this.parseTokens(tokensStr, original, labelToIdMap);

    // Parse examples (optional)
    const examples = examplesStr
      ? this.parseExamples(examplesStr, tokens.length, original)
      : undefined;

    return {
      rank: rank || undefined,
      tokens,
      examples,
    };
  }

  /**
   * Parse rank from the beginning of the line.
   */
  private static parseRank(line: string): number | undefined {
    const match = line.match(/^\((\d+)\)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Parse tokens separated by '+'.
   * @param tokensStr The tokens string to parse.
   * @param original The original line for error reporting.
   * @param labelToIdMap Optional map from labels to IDs for POS values.
   */
  private static parseTokens(
    tokensStr: string,
    original: string,
    labelToIdMap?: { [key: string]: string }
  ): WordCollocationToken[] {
    const tokenParts = tokensStr.split('+').map((t) => t.trim());
    const tokens: WordCollocationToken[] = [];
    let headCount = 0;

    for (const part of tokenParts) {
      if (!part) {
        throw new Error(`Empty token in "${original}"`);
      }

      const token = this.parseToken(part, original, labelToIdMap);
      if (token.isHead) {
        headCount++;
      }
      tokens.push(token);
    }

    if (headCount === 0) {
      throw new Error(`No head token found (enclose in <>) in "${original}"`);
    }
    if (headCount > 1) {
      throw new Error(`Multiple head tokens found in "${original}"`);
    }

    return tokens;
  }

  /**
   * Parse a single token.
   * @param part The token string to parse.
   * @param original The original line for error reporting.
   * @param labelToIdMap Optional map from labels to IDs for POS values.
   */
  private static parseToken(
    part: string,
    original: string,
    labelToIdMap?: { [key: string]: string }
  ): WordCollocationToken {
    const isHead = part.startsWith('<');
    let content = part;

    if (isHead) {
      if (!part.includes('>')) {
        throw new Error(`Unclosed '<' in token "${part}" in "${original}"`);
      }
      const endBracket = part.indexOf('>');
      if (endBracket === -1) {
        throw new Error(`Unclosed '<' in token "${part}" in "${original}"`);
      }
      content = part.substring(1, endBracket).trim();

      // Check for note after >
      const afterBracket = part.substring(endBracket + 1).trim();
      if (afterBracket) {
        const noteMatch = afterBracket.match(/^\(([^)]+)\)$/);
        if (noteMatch) {
          const pos = this.mapLabelToId(content, labelToIdMap);
          return {
            pos,
            isHead: true,
            note: noteMatch[1].trim(),
          };
        }
      }
    }

    // Check for note in parentheses
    const noteMatch = content.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (noteMatch) {
      const pos = this.mapLabelToId(noteMatch[1].trim(), labelToIdMap);
      return {
        pos,
        isHead: isHead || undefined,
        note: noteMatch[2].trim(),
      };
    }

    const pos = this.mapLabelToId(content.trim(), labelToIdMap);
    return {
      pos,
      isHead: isHead || undefined,
    };
  }

  /**
   * Map a label to its ID using the provided map, or return the label if no map is provided.
   * @param label The label to map.
   * @param labelToIdMap Optional map from labels to IDs.
   */
  private static mapLabelToId(label: string, labelToIdMap?: { [key: string]: string }): string {
    if (!labelToIdMap) {
      return label;
    }
    return labelToIdMap[label] ?? label;
  }

  /**
   * Map an ID to its label using the provided map, or return the ID if no map is provided.
   * @param id The ID to map.
   * @param idToLabelMap Optional map from IDs to labels.
   */
  private static mapIdToLabel(id: string, idToLabelMap?: { [key: string]: string }): string {
    if (!idToLabelMap) {
      return id;
    }
    return idToLabelMap[id] ?? id;
  }

  /**
   * Create an inverse map from IDs to labels.
   * @param labelToIdMap Map from labels to IDs.
   */
  private static createInverseMap(labelToIdMap: { [key: string]: string }): {
    [key: string]: string;
  } {
    const inverseMap: { [key: string]: string } = {};
    for (const [label, id] of Object.entries(labelToIdMap)) {
      inverseMap[id] = label;
    }
    return inverseMap;
  }

  /**
   * Parse examples from the string after ':'.
   */
  private static parseExamples(
    examplesStr: string,
    tokenCount: number,
    original: string
  ): WordCollocationExampleToken[] {
    const examples: WordCollocationExampleToken[] = [];
    const parts = this.splitExampleParts(examplesStr);

    let tokenNr = 0;

    for (const part of parts) {
      if (part.startsWith('<')) {
        // Head literal
        const literals = this.parseHeadLiteral(part, original);
        tokenNr++;
        examples.push({ tokenNr, literals });
      } else if (part.startsWith('[')) {
        // Alternative literals
        const literals = this.parseAlternativeLiterals(part, original);
        tokenNr++;
        examples.push({ tokenNr, literals });
      } else {
        // Simple literal
        const literals = [{ value: part.trim() }];
        examples.push({ tokenNr: 0, literals });
      }
    }

    return examples;
  }

  /**
   * Split example string into parts while respecting brackets.
   */
  private static splitExampleParts(examplesStr: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inBracket = false;
    let bracketType = '';

    for (let i = 0; i < examplesStr.length; i++) {
      const char = examplesStr[i];

      if (!inBracket && (char === '<' || char === '[')) {
        if (current.trim()) {
          parts.push(...current.trim().split(/\s+/));
          current = '';
        }
        inBracket = true;
        bracketType = char;
        current = char;
      } else if (
        inBracket &&
        ((bracketType === '<' && char === '>') || (bracketType === '[' && char === ']'))
      ) {
        current += char;
        // Check if there's a note following
        let j = i + 1;
        while (j < examplesStr.length && examplesStr[j] === ' ') j++;
        if (j < examplesStr.length && examplesStr[j] === '(') {
          const noteEnd = examplesStr.indexOf(')', j);
          if (noteEnd !== -1) {
            current += examplesStr.substring(i + 1, noteEnd + 1);
            i = noteEnd;
          }
        }
        parts.push(current.trim());
        current = '';
        inBracket = false;
        bracketType = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(...current.trim().split(/\s+/));
    }

    return parts.filter((p) => p.length > 0);
  }

  /**
   * Parse head literal enclosed in <>.
   */
  private static parseHeadLiteral(part: string, original: string): WordCollocationLiteral[] {
    if (!part.startsWith('<') || !part.includes('>')) {
      throw new Error(`Invalid head literal "${part}" in "${original}"`);
    }

    const endBracket = part.indexOf('>');
    const content = part.substring(1, endBracket).trim();

    const literal: WordCollocationLiteral = { value: '' };

    // Check for note within the brackets
    const noteMatch = content.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (noteMatch) {
      literal.value = noteMatch[1].trim();
      literal.note = noteMatch[2].trim();
    } else {
      literal.value = content;
    }

    return [literal];
  }

  /**
   * Parse alternative literals enclosed in [].
   */
  private static parseAlternativeLiterals(
    part: string,
    original: string
  ): WordCollocationLiteral[] {
    if (!part.startsWith('[') || !part.includes(']')) {
      throw new Error(`Invalid alternative literal "${part}" in "${original}"`);
    }

    const endBracket = part.indexOf(']');
    let content = part.substring(1, endBracket).trim();

    // Check for optional marker
    const isOptional = content.startsWith('?');
    if (isOptional) {
      content = content.substring(1).trim();
    }

    const alternatives = content.split(',').map((alt) => alt.trim());
    const literals: WordCollocationLiteral[] = [];

    for (const alt of alternatives) {
      const noteMatch = alt.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (noteMatch) {
        literals.push({
          value: noteMatch[1].trim(),
          note: noteMatch[2].trim(),
        });
      } else {
        literals.push({ value: alt });
      }
    }

    return literals;
  }

  /**
   * Convert a WordCollocation to a string representation.
   * @param collocation The collocation to convert.
   * @param labelToIdMap Optional map from labels to IDs for POS values (will be inverted).
   */
  static toString(collocation: WordCollocation, labelToIdMap?: { [key: string]: string }): string {
    const idToLabelMap = labelToIdMap ? this.createInverseMap(labelToIdMap) : undefined;

    let result = '';

    // Rank
    if (collocation.rank) {
      result += `(${collocation.rank}) `;
    }

    // Tokens
    result += collocation.tokens
      .map((token) => {
        const pos = this.mapIdToLabel(token.pos, idToLabelMap);
        let tokenStr = pos;
        if (token.note) {
          tokenStr += ` (${token.note})`;
        }
        if (token.isHead) {
          tokenStr = `<${tokenStr}>`;
        }
        return tokenStr;
      })
      .join('+');

    result += ':';

    // Examples
    if (collocation.examples && collocation.examples.length > 0) {
      result += ' ';
      const exampleParts: string[] = [];

      for (const example of collocation.examples) {
        if (example.tokenNr === 0) {
          // Simple literals
          for (const literal of example.literals) {
            exampleParts.push(literal.value);
          }
        } else {
          // Check if this is the head token
          const isHead = collocation.tokens[example.tokenNr - 1]?.isHead;

          if (isHead && example.literals.length === 1) {
            // Head literal - note goes INSIDE the brackets
            let literalStr = example.literals[0].value;
            if (example.literals[0].note) {
              literalStr += ` (${example.literals[0].note})`;
            }
            exampleParts.push(`<${literalStr}>`);
          } else if (example.literals.length === 1) {
            // Single alternative
            let literalStr = example.literals[0].value;
            if (example.literals[0].note) {
              literalStr += ` (${example.literals[0].note})`;
            }
            exampleParts.push(`[${literalStr}]`);
          } else {
            // Multiple alternatives
            const alternatives = example.literals
              .map((lit) => (lit.note ? `${lit.value} (${lit.note})` : lit.value))
              .join(', ');
            exampleParts.push(`[${alternatives}]`);
          }
        }
      }

      result += exampleParts.join(' ');
    }

    return result;
  }
}
