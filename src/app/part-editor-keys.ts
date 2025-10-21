import { PartEditorKeys } from '@myrmidon/cadmus-core';

// general
import {
  ASSERTED_HISTORICAL_DATES_PART_TYPEID,
  BIBLIOGRAPHY_PART_TYPEID,
  CATEGORIES_PART_TYPEID,
  COMMENT_PART_TYPEID,
  DECORATED_COUNTS_PART_TYPEID,
  DISTRICT_LOCATION_PART_TYPEID,
  DOC_REFERENCES_PART_TYPEID,
  METADATA_PART_TYPEID,
  NOTE_PART_TYPEID,
  PIN_LINKS_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';

// lexicography
import { LEX_LEMMA_PART_TYPEID } from '@myrmidon/cadmus-part-lexicography-lemma';
import { LEX_WORD_FORMS_PART_TYPEID } from '@myrmidon/cadmus-part-lexicography-word-forms';
import { LEX_WORD_SENSES_PART_TYPEID } from '@myrmidon/cadmus-part-lexicography-word-senses';
import { LEX_WORD_COLLOCATIONS_PART_TYPEID } from '@myrmidon/cadmus-part-lexicography-word-collocations';

// route constants
const GENERAL = 'general';
const LEXICOGRAPHY = 'lexicography';

/**
 * The parts and fragments editor keys for this UI.
 * Each property is a part type ID, mapped to a value of type PartGroupKey,
 * having a part property with the part's editor key, and a fragments property
 * with the mappings between fragment type IDs and their editor keys.
 */
export const PART_EDITOR_KEYS: PartEditorKeys = {
  // general
  [ASSERTED_HISTORICAL_DATES_PART_TYPEID]: {
    part: GENERAL,
  },
  [BIBLIOGRAPHY_PART_TYPEID]: {
    part: GENERAL,
  },
  [CATEGORIES_PART_TYPEID]: {
    part: GENERAL,
  },
  [COMMENT_PART_TYPEID]: {
    part: GENERAL,
  },
  [DECORATED_COUNTS_PART_TYPEID]: {
    part: GENERAL,
  },
  [DISTRICT_LOCATION_PART_TYPEID]: {
    part: GENERAL,
  },
  [DOC_REFERENCES_PART_TYPEID]: {
    part: GENERAL,
  },
  [METADATA_PART_TYPEID]: {
    part: GENERAL,
  },
  [NOTE_PART_TYPEID]: {
    part: GENERAL,
  },
  [PIN_LINKS_PART_TYPEID]: {
    part: GENERAL,
  },
  // lexicography
  [LEX_LEMMA_PART_TYPEID]: {
    part: LEXICOGRAPHY,
  },
  [LEX_WORD_FORMS_PART_TYPEID]: {
    part: LEXICOGRAPHY,
  },
  [LEX_WORD_SENSES_PART_TYPEID]: {
    part: LEXICOGRAPHY,
  },
  [LEX_WORD_COLLOCATIONS_PART_TYPEID]: {
    part: LEXICOGRAPHY,
  },
};
