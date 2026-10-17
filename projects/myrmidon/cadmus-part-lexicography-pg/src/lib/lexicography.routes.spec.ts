import { pendingChangesGuard } from '@myrmidon/cadmus-core';
import {
  LEX_LEMMA_PART_TYPEID,
  LexLemmaPartFeature,
} from '@myrmidon/cadmus-part-lexicography-lemma';
import {
  LEX_WORD_COLLOCATIONS_PART_TYPEID,
  LexWordCollocationsPartFeature,
} from '@myrmidon/cadmus-part-lexicography-word-collocations';
import {
  LEX_WORD_FORMS_PART_TYPEID,
  LexWordFormsPartFeature,
} from '@myrmidon/cadmus-part-lexicography-word-forms';
import {
  LEX_WORD_SENSES_PART_TYPEID,
  LexWordSensesPartFeature,
} from '@myrmidon/cadmus-part-lexicography-word-senses';

import { CADMUS_PART_LEXICOGRAPHY_PG_ROUTES } from './lexicography.routes';

describe('CADMUS_PART_LEXICOGRAPHY_PG_ROUTES', () => {
  const expected = [
    { typeId: LEX_LEMMA_PART_TYPEID, component: LexLemmaPartFeature },
    { typeId: LEX_WORD_FORMS_PART_TYPEID, component: LexWordFormsPartFeature },
    { typeId: LEX_WORD_SENSES_PART_TYPEID, component: LexWordSensesPartFeature },
    { typeId: LEX_WORD_COLLOCATIONS_PART_TYPEID, component: LexWordCollocationsPartFeature },
  ];

  it('should have a route for each part type', () => {
    expect(CADMUS_PART_LEXICOGRAPHY_PG_ROUTES).toHaveLength(expected.length);
  });

  it.each(expected)('should route $typeId to its feature', ({ typeId, component }) => {
    const route = CADMUS_PART_LEXICOGRAPHY_PG_ROUTES.find((r) => r.component === component);
    expect(route).toBeDefined();
    // part features get their type ID from the path before the part ID
    expect(route!.path).toBe(`${typeId}/:pid`);
    expect(route!.pathMatch).toBe('full');
  });

  it.each(expected)('should guard pending changes for $typeId', ({ component }) => {
    const route = CADMUS_PART_LEXICOGRAPHY_PG_ROUTES.find((r) => r.component === component);
    expect(route!.canDeactivate).toEqual([pendingChangesGuard]);
  });
});
