import { Part } from '@myrmidon/cadmus-core';

import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';

export interface WordSenseExample {
  tags?: string[];
  text: string;
  explanation?: string;
  citation?: string;
  note?: string;
}

export interface WordSense {
  eid?: string;
  tags?: string[];
  definition: string;
  note?: string;
  relatedIds?: AssertedCompositeId[];
  examples?: WordSenseExample[];
}

/**
 * The lexicography word senses part model.
 */
export interface LexWordSensesPart extends Part {
  senses: WordSense[];
}

/**
 * The type ID used to identify the LexWordSensesPart type.
 */
export const LEX_WORD_SENSES_PART_TYPEID = 'it.vedph.lexicography.word-senses';

/**
 * JSON schema for the LexWordSenses part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const LEX_WORD_SENSES_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'www.vedph.it/cadmus/parts/lexicography/' + LEX_WORD_SENSES_PART_TYPEID + '.json',
  type: 'object',
  title: 'LexWordSensesPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'senses',
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
    senses: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['definition'],
        properties: {
          eid: {
            type: 'string',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          definition: {
            type: 'string',
          },
          note: {
            type: 'string',
          },
          relatedIds: {
            type: 'array',
            items: {
              type: 'object',
              required: ['target'],
              properties: {
                // PinTarget
                target: {
                  type: 'object',
                  required: ['gid', 'label'],
                  properties: {
                    gid: { type: 'string' },
                    label: { type: 'string' },
                    itemId: { type: 'string' },
                    partId: { type: 'string' },
                    partTypeId: { type: 'string' },
                    roleId: { type: 'string' },
                    name: { type: 'string' },
                    value: { type: 'string' },
                  },
                  additionalProperties: false,
                },
                tag: { type: 'string' },
                scope: { type: 'string' },
                // Assertion
                assertion: {
                  type: 'object',
                  required: ['rank'],
                  properties: {
                    tag: { type: 'string' },
                    rank: { type: 'number' },
                    note: { type: 'string' },
                    references: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['citation'],
                        properties: {
                          type: { type: 'string' },
                          tag: { type: 'string' },
                          citation: { type: 'string' },
                          note: { type: 'string' },
                        },
                        additionalProperties: false,
                      },
                    },
                  },
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
  },
};
