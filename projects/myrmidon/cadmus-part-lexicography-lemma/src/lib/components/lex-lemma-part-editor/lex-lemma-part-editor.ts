import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  InjectionToken,
  linkedSignal,
} from '@angular/core';
import { FormField, max, maxLength, min, required } from '@angular/forms/signals';
import { TitleCasePipe } from '@angular/common';

import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  copyFormValue,
} from '@myrmidon/cadmus-ui';
import { NgxToolsSignalValidators } from '@myrmidon/ngx-tools';

import { LEX_LEMMA_PART_TYPEID, LexLemmaPart, WordForm } from '../../lex-lemma-part';
import { WordFormSetEditor } from '../word-form-set-editor/word-form-set-editor';

/**
 * ID generator for lexicography lemma parts.
 */
export interface LidGenerator {
  getLid(part: LexLemmaPart): string;
}

/**
 * Injection token for lexicography lemma part LID generator.
 */
export const LEX_LEMMA_PART_LID_GENERATOR_TOKEN = new InjectionToken<LidGenerator>('LidGenerator');

/**
 * The editable draft behind the form.
 */
interface LexLemmaPartControls {
  lid: string;
  homograph: number | null;
  forms: WordForm[];
}

function toDraft(part?: LexLemmaPart | null): LexLemmaPartControls {
  return {
    lid: part?.lid || '',
    homograph: part?.homograph || 0,
    // copy: the form tags the objects in its arrays
    forms: copyFormValue(part?.forms || []),
  };
}

/**
 * Lexicography lemma part editor component.
 * Note that this component requires a SidGenerator service to be provided via
 * the LEX_LEMMA_PART_SID_GENERATOR_TOKEN injection token.
 * Thesauri: lex-word-form-types, lex-word-form-prefixes, lex-word-form-suffixes,
 * lex-pos-tags, lex-word-form-features, lex-word-form-tags.
 */
@Component({
  selector: 'cadmus-lex-lemma-part-editor',
  imports: [
    FormField,
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatError,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatTooltip,
    TitleCasePipe,
    CloseSaveButtonsComponent,
    WordFormSetEditor,
  ],
  templateUrl: './lex-lemma-part-editor.html',
  styleUrl: './lex-lemma-part-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexLemmaPartEditor extends ModelEditorComponentBase<LexLemmaPart> {
  private readonly _sidGenerator = inject(LEX_LEMMA_PART_LID_GENERATOR_TOKEN);

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
    required(p.lid);
    maxLength(p.lid, 300);
    min(p.homograph, 0);
    max(p.homograph, 50);
    NgxToolsSignalValidators.strictMinLength(p.forms, 1);
  });

  // a user action: the set editor emits only when forms are changed
  public onFormsChange(forms: WordForm[]): void {
    this.form.forms().value.set(copyFormValue(forms || []));
    this.form.forms().markAsDirty();
  }

  protected getValue(): LexLemmaPart {
    const part = this.getEditedPart(LEX_LEMMA_PART_TYPEID) as LexLemmaPart;
    const draft = this._draft();
    part.lid = draft.lid.trim();
    part.homograph = draft.homograph || undefined;
    part.forms = copyFormValue(draft.forms);
    return part;
  }

  public generateLid(): void {
    const lid = this._sidGenerator.getLid(this.getValue());
    this.form.lid().value.set(lid);
    this.form.lid().markAsDirty();
  }
}
