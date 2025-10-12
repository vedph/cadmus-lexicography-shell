import { Routes } from '@angular/router';

// cadmus
import { pendingChangesGuard } from '@myrmidon/cadmus-core';

import {
  LEX_LEMMA_PART_TYPEID,
  LexLemmaPartFeature,
} from '@myrmidon/cadmus-part-lexicography-lemma';

export const CADMUS_PART_LEXIOGRAPHY_PG_ROUTES: Routes = [
  {
    path: `${LEX_LEMMA_PART_TYPEID}/:pid`,
    pathMatch: 'full',
    component: LexLemmaPartFeature,
    canDeactivate: [pendingChangesGuard],
  },
  // ... etc.
];
