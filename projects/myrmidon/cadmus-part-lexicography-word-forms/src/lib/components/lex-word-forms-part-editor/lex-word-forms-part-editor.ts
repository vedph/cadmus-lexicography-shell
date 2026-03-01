import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
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

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { EditedObject, ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { CloseSaveButtonsComponent, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { WordForm, WordFormSetEditor } from '@myrmidon/cadmus-part-lexicography-lemma';
import { LEX_WORD_FORMS_PART_TYPEID, LexWordFormsPart } from '../../lex-word-forms-part';

/**
 * Lexicography word forms part editor component.
 * Thesauri: lex-word-form-types, lex-word-form-prefixes, lex-word-form-suffixes,
 * lex-pos-tags, lex-word-form-features, lex-word-form-tags.
 */
@Component({
  selector: 'cadmus-lex-word-forms-part-editor',
  imports: [
    ReactiveFormsModule,
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
export class LexWordFormsPartEditor
  extends ModelEditorComponentBase<LexWordFormsPart>
  implements OnInit
{
  public forms: FormControl<WordForm[]>;

  // lex-word-form-types
  public readonly typeEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // lex-word-form-prefixes
  public readonly prefixEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // lex-word-form-suffixes
  public readonly suffixEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // lex-pos-tags (required)
  public readonly posEntries = signal<ThesaurusEntry[]>([]);
  // lex-word-form-features
  public readonly featureEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // lex-word-form-tags
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

  constructor(authService: AuthJwtService, formBuilder: FormBuilder) {
    super(authService, formBuilder);
    // form
    this.forms = formBuilder.control([], { nonNullable: true });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      forms: this.forms,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'lex-word-form-types';
    if (this.hasThesaurus(key)) {
      this.typeEntries.set(thesauri[key].entries);
    } else {
      this.typeEntries.set(undefined);
    }
    key = 'lex-word-form-prefixes';
    if (this.hasThesaurus(key)) {
      this.prefixEntries.set(thesauri[key].entries);
    } else {
      this.prefixEntries.set(undefined);
    }
    key = 'lex-word-form-suffixes';
    if (this.hasThesaurus(key)) {
      this.suffixEntries.set(thesauri[key].entries);
    } else {
      this.suffixEntries.set(undefined);
    }
    key = 'lex-pos-tags';
    if (this.hasThesaurus(key)) {
      this.posEntries.set(thesauri[key].entries!);
    } else {
      this.posEntries.set([]);
    }
    key = 'lex-word-form-features';
    if (this.hasThesaurus(key)) {
      this.featureEntries.set(thesauri[key].entries);
    } else {
      this.featureEntries.set(undefined);
    }
    key = 'lex-word-form-tags';
    if (this.hasThesaurus(key)) {
      this.tagEntries.set(thesauri[key].entries);
    } else {
      this.tagEntries.set(undefined);
    }
  }

  private updateForm(part?: LexWordFormsPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.forms.setValue(part.forms || []);
    this.form.markAsPristine();
  }

  public onFormsChange(forms: WordForm[]): void {
    this.forms.setValue(forms || []);
    this.forms.markAsDirty();
    this.forms.updateValueAndValidity();
  }

  protected override onDataSet(data?: EditedObject<LexWordFormsPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): LexWordFormsPart {
    let part = this.getEditedPart(LEX_WORD_FORMS_PART_TYPEID) as LexWordFormsPart;
    part.forms = this.forms.value || [];
    return part;
  }
}
