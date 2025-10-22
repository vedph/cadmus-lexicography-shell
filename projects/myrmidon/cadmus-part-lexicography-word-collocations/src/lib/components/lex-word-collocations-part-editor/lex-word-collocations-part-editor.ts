import { Component, computed, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  ReactiveFormsModule,
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
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatFormField, MatLabel, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { EditedObject, ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { CloseSaveButtonsComponent, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import {
  LEX_WORD_COLLOCATIONS_PART_TYPEID,
  LexWordCollocationsPart,
  WordCollocation,
} from '../../lex-word-collocations-part';
import { WordCollocEditor } from '../word-colloc-editor/word-colloc-editor';
import { WordCollocationPipe } from '../../pipes/word-collocation.pipe';
import { WordCollocationParser } from '../../../public-api';

/**
 * WordCollocationsPart editor component.
 * Thesauri: lex-word-ctoken-pos-tags, lex-word-ctoken-features, lex-word-cliteral-tags.
 */
@Component({
  selector: 'cadmus-lex-word-collocations-part-editor',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatTooltip,
    TitleCasePipe,
    CloseSaveButtonsComponent,
    WordCollocEditor,
    WordCollocationPipe,
    MatHint
],
  templateUrl: './lex-word-collocations-part-editor.html',
  styleUrl: './lex-word-collocations-part-editor.css',
})
export class LexWordCollocationPartEditor
  extends ModelEditorComponentBase<LexWordCollocationsPart>
  implements OnInit
{
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<WordCollocation | undefined>(undefined);

  // lex-word-ctoken-pos-tags
  public readonly tokPosEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // lex-word-ctoken-features
  public readonly tokFeatureEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // lex-word-cliteral-tags
  public readonly litTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);

  public readonly labelToIdMap = computed<{ [key: string]: string }>(() => {
    const map: { [key: string]: string } = {};
    const posEntries = this.tokPosEntries();
    if (posEntries) {
      for (const entry of posEntries) {
        map[entry.value] = entry.id;
      }
    }
    return map;
  });

  public collocations: FormControl<WordCollocation[]>;

  public dslText: FormControl<string | null>;
  public dslForm: FormGroup;
  public readonly dslError = signal<string | undefined>(undefined);

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService
  ) {
    super(authService, formBuilder);
    // form
    this.collocations = formBuilder.control([], {
      // at least 1 entry
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });

    // DSL form
    this.dslText = formBuilder.control(null, Validators.required);
    this.dslForm = formBuilder.group({
      dslText: this.dslText,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      entries: this.collocations,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    let key = 'lex-word-ctoken-pos-tags';
    if (this.hasThesaurus(key)) {
      this.tokPosEntries.set(thesauri[key].entries);
    } else {
      this.tokPosEntries.set(undefined);
    }
    key = 'lex-word-ctoken-features';
    if (this.hasThesaurus(key)) {
      this.tokFeatureEntries.set(thesauri[key].entries);
    } else {
      this.tokFeatureEntries.set(undefined);
    }
    key = 'lex-word-cliteral-tags';
    if (this.hasThesaurus(key)) {
      this.litTagEntries.set(thesauri[key].entries);
    } else {
      this.litTagEntries.set(undefined);
    }
  }

  private updateForm(part?: LexWordCollocationsPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.collocations.setValue(part.collocations || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<LexWordCollocationsPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }

    // form
    this.updateForm(data?.value);
  }

  protected getValue(): LexWordCollocationsPart {
    let part = this.getEditedPart(LEX_WORD_COLLOCATIONS_PART_TYPEID) as LexWordCollocationsPart;
    part.collocations = this.collocations.value || [];
    return part;
  }

  public addCollocation(): void {
    const collocation: WordCollocation = {
      tokens: [],
    };
    this.editCollocation(collocation, -1);
  }

  public editCollocation(collocation: WordCollocation, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(structuredClone(collocation));
  }

  public closeCollocation(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveCollocation(collocation: WordCollocation): void {
    const collocations = [...this.collocations.value];
    if (this.editedIndex() === -1) {
      collocations.push(collocation);
    } else {
      collocations.splice(this.editedIndex(), 1, collocation);
    }
    this.collocations.setValue(collocations);
    this.collocations.markAsDirty();
    this.collocations.updateValueAndValidity();
    this.closeCollocation();
  }

  public deleteCollocation(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete collocation?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex() === index) {
            this.closeCollocation();
          }
          const collocations = [...this.collocations.value];
          collocations.splice(index, 1);
          this.collocations.setValue(collocations);
          this.collocations.markAsDirty();
          this.collocations.updateValueAndValidity();
        }
      });
  }

  public moveCollocationUp(index: number): void {
    if (index < 1) {
      return;
    }
    const collocation = this.collocations.value[index];
    const collocations = [...this.collocations.value];
    collocations.splice(index, 1);
    collocations.splice(index - 1, 0, collocation);
    this.collocations.setValue(collocations);
    this.collocations.markAsDirty();
    this.collocations.updateValueAndValidity();
  }

  public moveCollocationDown(index: number): void {
    if (index + 1 >= this.collocations.value.length) {
      return;
    }
    const collocation = this.collocations.value[index];
    const collocations = [...this.collocations.value];
    collocations.splice(index, 1);
    collocations.splice(index + 1, 0, collocation);
    this.collocations.setValue(collocations);
    this.collocations.markAsDirty();
    this.collocations.updateValueAndValidity();
  }

  public parseDsl(): void {
    const dsl = this.dslText.value;
    if (!dsl) {
      return;
    }
    try {
      const result = WordCollocationParser.parse(dsl);
      if (result.error) {
        this.dslError.set(`Error parsing DSL: ${result.error}`);
      } else {
        const collocations = [...this.collocations.value];
        collocations.push(...result.value);
        this.collocations.setValue(collocations);
        this.collocations.markAsDirty();
        this.collocations.updateValueAndValidity();
        this.dslError.set(undefined);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
