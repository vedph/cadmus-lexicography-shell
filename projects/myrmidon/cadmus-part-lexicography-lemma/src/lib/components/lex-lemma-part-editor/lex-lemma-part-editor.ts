import { Component, inject, InjectionToken, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  UntypedFormGroup,
  Validators,
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

import { EditedObject, ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { CloseSaveButtonsComponent, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

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
 * Lexicography lemma part editor component.
 * Note that this component requires a SidGenerator service to be provided via
 * the LEX_LEMMA_PART_SID_GENERATOR_TOKEN injection token.
 * Thesauri: lex-word-form-types, lex-word-form-prefixes, lex-word-form-suffixes,
 * lex-pos-tags, lex-word-form-features, lex-word-form-tags.
 */
@Component({
  selector: 'cadmus-lex-lemma-part-editor',
  imports: [
    ReactiveFormsModule,
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
})
export class LexLemmaPartEditor extends ModelEditorComponentBase<LexLemmaPart> implements OnInit {
  private readonly _sidGenerator: LidGenerator;

  public lid: FormControl<string | null>;
  public homograph: FormControl<number>;
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
    this.lid = formBuilder.control(null, {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(300)],
    });
    this.homograph = formBuilder.control(0, { nonNullable: true });
    this.forms = formBuilder.control([], { nonNullable: true });

    this._sidGenerator = inject(LEX_LEMMA_PART_LID_GENERATOR_TOKEN);
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      lid: this.lid,
      homograph: this.homograph,
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

  private updateForm(part?: LexLemmaPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.lid.setValue(part.lid || null);
    this.homograph.setValue(part.homograph || 0);
    this.forms.setValue(part.forms || []);
    this.form.markAsPristine();
  }

  public onFormsChange(forms: WordForm[]): void {
    this.forms.setValue(forms || []);
    this.forms.markAsDirty();
    this.forms.updateValueAndValidity();
  }

  protected override onDataSet(data?: EditedObject<LexLemmaPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): LexLemmaPart {
    let part = this.getEditedPart(LEX_LEMMA_PART_TYPEID) as LexLemmaPart;
    part.lid = this.lid.value || '';
    part.homograph = this.homograph.value || undefined;
    part.forms = this.forms.value || [];
    return part;
  }

  public generateLid(): void {
    const part = this.getValue();
    const lid = this._sidGenerator.getLid(part);
    this.lid.setValue(lid);
    this.lid.markAsDirty();
    this.lid.updateValueAndValidity();
  }
}
