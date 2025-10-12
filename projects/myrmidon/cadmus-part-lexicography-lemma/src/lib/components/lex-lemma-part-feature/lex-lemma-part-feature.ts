import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';

import { LexLemmaPartEditor } from '../lex-lemma-part-editor/lex-lemma-part-editor';

@Component({
  selector: 'cadmus-lex-lemma-part-feature',
  imports: [CurrentItemBarComponent, LexLemmaPartEditor],
  templateUrl: './lex-lemma-part-feature.html',
  styleUrl: './lex-lemma-part-feature.css',
})
export class LexLemmaPartFeature extends EditPartFeatureBase implements OnInit {
  constructor(
    router: Router,
    route: ActivatedRoute,
    snackbar: MatSnackBar,
    itemService: ItemService,
    thesaurusService: ThesaurusService,
    editorService: PartEditorService
  ) {
    super(router, route, snackbar, itemService, thesaurusService, editorService);
  }

  protected override getReqThesauriIds(): string[] {
    return [
      'lex-word-form-types',
      'lex-word-form-prefixes',
      'lex-word-form-suffixes',
      'lex-pos-tags',
      'lex-word-form-features',
      'lex-word-form-tags',
    ];
  }
}
