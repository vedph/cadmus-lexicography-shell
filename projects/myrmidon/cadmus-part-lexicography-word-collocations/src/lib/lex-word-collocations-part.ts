import { Part } from '@myrmidon/cadmus-core';

/**
 * A token in a word collocation pattern.
 */
export interface WordCollocationToken {
  pos: string;
  features?: string[];
  isHead?: boolean;
  isOptional?: boolean;
  note?: string;
}

/**
 * A literal instance of a collocation pattern token.
 */
export interface WordCollocationLiteral {
  value: string;
  tag?: string;
  note?: string;
}

/**
 * An example of a word collocation pattern.
 */
export interface WordCollocationExample {
  tokenNr: number;  // 0 for connective text, 1..n for tokens
  literals: WordCollocationLiteral[];
}

/**
 * A words collocation pattern. This is a sequence of tokens, each
 * representing the word class (part of speech) for each word building
 * the collocation pattern. For example, a collocation like
 * "strong tea" would have the pattern ADJ+NOUN. Usually one word in the
 * pattern is the head token, because it is the lexical entry word
 * including this collocation. So, if the lexical entry word is "tea",
 * then the 2nd token (NOUN) is the head.
 * Examples then provide real-world sentences illustrating the use
 * of the collocation. These include 1 literal per token (each having the
 * ordinal number of the token it refers to in the pattern), plus eventual
 * connective text represented by literals whose token number is 0.
 */
export interface WordCollocation {
  rank?: number;
  tokens: WordCollocationToken[];
  examples?: WordCollocationExample[];
  note?: string;
}

/**
 * The LexWordCollocations part model.
 */
export interface LexWordCollocationsPart extends Part {
  collocations: WordCollocation[];
}

/**
 * The type ID used to identify the LexWordCollocationsPart type.
 */
export const LEX_WORD_COLLOCATIONS_PART_TYPEID = 'it.vedph.lexicography.word-collocations';

/**
 * JSON schema for the LexWordCollocations part.
 * You can use the JSON schema tool at https://jsonschema.net/.
 */
export const LEX_WORD_COLLOCATIONS_PART_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'www.vedph.it/cadmus/parts/lexicography/' + LEX_WORD_COLLOCATIONS_PART_TYPEID + '.json',
  type: 'object',
  title: 'LexWordCollocationsPart',
  required: [
    'id',
    'itemId',
    'typeId',
    'timeCreated',
    'creatorId',
    'timeModified',
    'userId',
    'collocations',
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

    collocations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['tokens'],
        properties: {
          rank: {
            type: 'integer',
          },
          tokens: {
            type: 'array',
            items: { $ref: '#/definitions/token' },
            minItems: 1,
          },
          examples: {
            type: 'array',
            items: { $ref: '#/definitions/example' },
          },
          note: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    },
  },
  definitions: {
    token: {
      type: 'object',
      required: ['pos'],
      properties: {
        pos: { type: 'string' },
        features: {
          type: 'array',
          items: { type: 'string' },
        },
        isHead: { type: 'boolean' },
        isOptional: { type: 'boolean' },
        note: { type: 'string' },
      },
      additionalProperties: false,
    },
    literal: {
      type: 'object',
      required: ['value'],
      properties: {
        value: { type: 'string' },
        tag: { type: 'string' },
        note: { type: 'string' },
      },
      additionalProperties: false,
    },
    example: {
      type: 'object',
      required: ['tokenNr', 'literals'],
      properties: {
        tokenNr: { type: 'integer' },
        literals: {
          type: 'array',
          items: { $ref: '#/definitions/literal' },
          minItems: 1,
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};
