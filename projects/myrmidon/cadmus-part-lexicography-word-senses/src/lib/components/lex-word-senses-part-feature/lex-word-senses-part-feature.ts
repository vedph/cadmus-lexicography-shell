import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-item-editor';

import { LexWordSensesPartEditor } from '../lex-word-senses-part-editor/lex-word-senses-part-editor';

@Component({
  selector: 'cadmus-lex-word-senses-part-feature',
  imports: [CurrentItemBarComponent, LexWordSensesPartEditor],
  templateUrl: './lex-word-senses-part-feature.html',
  styleUrl: './lex-word-senses-part-feature.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexWordSensesPartFeature extends EditPartFeatureBase implements OnInit {
  constructor(
    router: Router,
    route: ActivatedRoute,
    snackbar: MatSnackBar,
    itemService: ItemService,
    thesaurusService: ThesaurusService,
    editorService: PartEditorService
  ) {
    super(router, route, snackbar, itemService, thesaurusService, editorService);
    this.roleIdInThesauri = true;
  }

  protected override getReqThesauriIds(): string[] {
    return [
      'lex-word-sense-tags',
      'asserted-id-scopes',
      'asserted-id-tags',
      'doc-reference-types',
      'doc-reference-tags',
      'asserted-id-features',
    ];
  }
}
