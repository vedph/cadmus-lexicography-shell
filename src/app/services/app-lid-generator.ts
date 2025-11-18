import { Injectable } from '@angular/core';

import { LexLemmaPart, LidGenerator } from '@myrmidon/cadmus-part-lexicography-lemma';

@Injectable({
  providedIn: 'root',
})
export class AppLidGenerator implements LidGenerator {
  /**
   * Generate the LID for a lexicography lemma part. This implementation is a stub
   * and assumes Italian language, following these rules:
   * - remove any non-letter character from the lemma.
   * - remove accents from letters (we just check for the most common ANSI accented vowels).
   * - convert to lowercase.
   * - if there is a homograph number > 0, append it to the LID with 2 digits, prefixed by dash.
   * @param part The source part.
   * @returns The LID.
   */
  getLid(part: LexLemmaPart): string {
    const sb: string[] = [];
    const lemma = part.forms?.length ? part.forms[0].value : undefined;
    if (!lemma) {
      return '';
    }

    for (let i = 0; i < lemma.length; i++) {
      const c = lemma.charAt(i);
      // check if letter
      if (
        (c >= 'A' && c <= 'Z') ||
        (c >= 'a' && c <= 'z') ||
        (c >= 'À' && c <= 'Ö') ||
        (c >= 'Ø' && c <= 'ö') ||
        (c >= 'ø' && c <= 'ÿ')
      ) {
        // normalize accented letters
        switch (c) {
          case 'À':
          case 'Á':
          case 'Â':
          case 'Ã':
          case 'Ä':
          case 'Å':
          case 'à':
          case 'á':
          case 'â':
          case 'ã':
          case 'ä':
          case 'å':
            sb.push('a');
            break;
          case 'È':
          case 'É':
          case 'Ê':
          case 'Ë':
          case 'è':
          case 'é':
          case 'ê':
          case 'ë':
            sb.push('e');
            break;
          case 'Ì':
          case 'Í':
          case 'Î':
          case 'Ï':
          case 'ì':
          case 'í':
          case 'î':
          case 'ï':
            sb.push('i');
            break;
          case 'Ò':
          case 'Ó':
          case 'Ô':
          case 'Õ':
          case 'Ö':
          case 'ò':
          case 'ó':
          case 'ô':
          case 'õ':
          case 'ö':
            sb.push('o');
            break;
          case 'Ù':
          case 'Ú':
          case 'Û':
          case 'Ü':
          case 'ù':
          case 'ú':
          case 'û':
          case 'ü':
            sb.push('u');
            break;
          default:
            sb.push(c.toLowerCase());
            break;
        }
      }
    }

    if (part.homograph && part.homograph > 0) {
      sb.push('-' + part.homograph.toString().padStart(2, '0'));
    }

    return sb.join('');
  }
}
