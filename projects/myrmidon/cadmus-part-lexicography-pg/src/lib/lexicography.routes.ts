import { Routes } from '@angular/router';

// cadmus
import { pendingChangesGuard } from '@myrmidon/cadmus-core';

import {
  LEX_LEMMA_PART_TYPEID,
  LexLemmaPartFeature,
} from '@myrmidon/cadmus-part-lexicography-lemma';
import {
  LEX_WORD_FORMS_PART_TYPEID,
  LexWordFormsPartFeature,
} from '@myrmidon/cadmus-part-lexicography-word-forms';
import {
  LEX_WORD_SENSES_PART_TYPEID,
  LexWordSensesPartFeature,
} from '@myrmidon/cadmus-part-lexicography-word-senses';

export const CADMUS_PART_LEXICOGRAPHY_PG_ROUTES: Routes = [
  {
    path: `${LEX_LEMMA_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: LexLemmaPartFeature,
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: `${LEX_WORD_FORMS_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: LexWordFormsPartFeature,
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: `${LEX_WORD_SENSES_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: LexWordSensesPartFeature,
    canDeactivate: [pendingChangesGuard],
  },
];
