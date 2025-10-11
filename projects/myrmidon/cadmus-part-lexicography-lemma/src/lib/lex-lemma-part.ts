import { Part } from '@myrmidon/cadmus-core';

/**
 * A word form.
 */
export interface WordForm {
  type: string;
  prefix?: string;
  value: string;
  suffix?: string;
  pos: string;
  features?: string[];
  tags?: string[];
  note?: string;
}

/**
 * The lemma part model.
 */
export interface LexLemmaPart extends Part {
  lid: string;
  homograph?: number;
  forms: WordForm[];
}

/**
 * The type ID used to identify the lemma part type.
 */
export const LEX_LEMMA_PART_TYPEID = 'it.vedph.lexicography.lemma';

/**
 * JSON schema for the lemma part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const LEX_LEMMA_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'www.vedph.it/cadmus/parts/myrmidon/lexicography/' + LEX_LEMMA_PART_TYPEID + '.json',
  type: 'object',
  title: 'LexLemmaPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'lid',
    'forms',
  ],
  properties: {
    timeCreated: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d+Z$',
    },
    creatorId: {
      type: 'string',
    },
    timeModified: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d+Z$',
    },
    userId: {
      type: 'string',
    },
    id: {
      type: 'string',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    itemId: {
      type: 'string',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    typeId: {
      type: 'string',
      pattern: '^[a-z][-0-9a-z._]*$',
    },
    roleId: {
      type: ['string', 'null'],
      pattern: '^([a-z][-0-9a-z._]*)?$',
    },

    // TODO: add properties and fill the "required" array as needed
  },
};
