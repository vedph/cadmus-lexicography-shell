import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';

import { LexWordCollocationPartEditor } from '../lex-word-collocations-part-editor/lex-word-collocations-part-editor';

@Component({
  selector: 'cadmus-lex-word-collocations-part-feature',
  imports: [CurrentItemBarComponent, LexWordCollocationPartEditor],
  templateUrl: './lex-word-collocations-part-feature.html',
  styleUrl: './lex-word-collocations-part-feature.css',
})
export class LexWordCollocationsPartFeature extends EditPartFeatureBase implements OnInit {
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
    return ['lex-word-ctoken-pos-tags', 'lex-word-ctoken-features', 'lex-word-cliteral-tags'];
  }
}
