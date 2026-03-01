import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';

import { LexWordFormsPartEditor } from '../lex-word-forms-part-editor/lex-word-forms-part-editor';

@Component({
  selector: 'cadmus-lex-word-forms-part-feature',
  imports: [CurrentItemBarComponent, LexWordFormsPartEditor],
  templateUrl: './lex-word-forms-part-feature.html',
  styleUrl: './lex-word-forms-part-feature.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexWordFormsPartFeature extends EditPartFeatureBase implements OnInit {
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
    this.roleIdInThesauri = true;

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
