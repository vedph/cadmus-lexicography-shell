import { Pipe, PipeTransform } from '@angular/core';

import { WordCollocation } from '../../lex-word-collocations-part';
import { WordCollocationParser } from '../../../public-api';

/**
 * A pipe to format a word collocation as string.
 * Usage:
 * ```html
 * {{ collocation | wordCollocation:labelToIdMap }}
 * ```
 */
@Pipe({
  name: 'wordCollocation',
  pure: true,
})
export class WordCollocationPipe implements PipeTransform {
  transform(
    value: WordCollocation | null | undefined,
    labelToIdMap?: { [key: string]: string }
  ): string {
    if (!value) {
      return '';
    }
    try {
      return WordCollocationParser.toString(value, labelToIdMap);
    } catch {
      return '';
    }
  }
}
