import { Part } from '@myrmidon/cadmus-core';

import { WordForm } from '@myrmidon/cadmus-part-lexicography-lemma';

/**
 * The LexWordForms part model.
 */
export interface LexWordFormsPart extends Part {
  forms: WordForm[];
}

/**
 * The type ID used to identify the LexWordFormsPart type.
 */
export const LEX_WORD_FORMS_PART_TYPEID = 'it.vedph.lexicography.word-forms';

/**
 * JSON schema for the LexWordForms part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const LEX_WORD_FORMS_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'www.vedph.it/cadmus/parts/lexicography/' + LEX_WORD_FORMS_PART_TYPEID + '.json',
  type: 'object',
  title: 'LexWordFormsPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
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
    forms: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['type', 'value', 'pos'],
        properties: {
          type: {
            type: 'string',
          },
          prefix: {
            type: 'string',
          },
          value: {
            type: 'string',
          },
          suffix: {
            type: 'string',
          },
          pos: {
            type: 'string',
          },
          features: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          note: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    },
  },
};
