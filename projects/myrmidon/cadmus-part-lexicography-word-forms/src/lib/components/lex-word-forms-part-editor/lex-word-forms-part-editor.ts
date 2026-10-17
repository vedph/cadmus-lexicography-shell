import { ChangeDetectionStrategy, Component, computed, linkedSignal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';

import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  copyFormValue,
} from '@myrmidon/cadmus-ui';
import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { WordForm, WordFormSetEditor } from '@myrmidon/cadmus-part-lexicography-lemma';
import { LEX_WORD_FORMS_PART_TYPEID, LexWordFormsPart } from '../../lex-word-forms-part';

/**
 * The editable draft behind the form.
 */
interface LexWordFormsPartControls {
  forms: WordForm[];
}

function toDraft(part?: LexWordFormsPart | null): LexWordFormsPartControls {
  // copy: the form tags the objects in its arrays
  return { forms: copyFormValue(part?.forms || []) };
}

/**
 * Lexicography word forms part editor component.
 * Thesauri: lex-word-form-types, lex-word-form-prefixes, lex-word-form-suffixes,
 * lex-pos-tags, lex-word-form-features, lex-word-form-tags.
 */
@Component({
  selector: 'cadmus-lex-word-forms-part-editor',
  imports: [
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatIcon,
    MatTooltip,
    TitleCasePipe,
    CloseSaveButtonsComponent,
    WordFormSetEditor,
  ],
  templateUrl: './lex-word-forms-part-editor.html',
  styleUrl: './lex-word-forms-part-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexWordFormsPartEditor extends ModelEditorComponentBase<LexWordFormsPart> {
  // lex-word-form-types
  public readonly typeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['lex-word-form-types']?.entries,
  );
  // lex-word-form-prefixes
  public readonly prefixEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['lex-word-form-prefixes']?.entries,
  );
  // lex-word-form-suffixes
  public readonly suffixEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['lex-word-form-suffixes']?.entries,
  );
  // lex-pos-tags (required)
  public readonly posEntries = computed<ThesaurusEntry[]>(
    () => this.data()?.thesauri?.['lex-pos-tags']?.entries || [],
  );
  // lex-word-form-features
  public readonly featureEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['lex-word-form-features']?.entries,
  );
  // lex-word-form-tags
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['lex-word-form-tags']?.entries,
  );

  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    NgxToolsSignalValidators.strictMinLength(p.forms, 1);
  });

  // a user action: the set editor emits only when forms are changed
  public onFormsChange(forms: WordForm[]): void {
    this.form.forms().value.set(copyFormValue(forms || []));
    this.form.forms().markAsDirty();
  }

  protected getValue(): LexWordFormsPart {
    const part = this.getEditedPart(LEX_WORD_FORMS_PART_TYPEID) as LexWordFormsPart;
    part.forms = copyFormValue(this._draft().forms);
    return part;
  }
}
