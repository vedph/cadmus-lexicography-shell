import { Component, input, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';

import { WordForm } from '../../lex-lemma-part';
import { WordFormEditor } from '../word-form-editor/word-form-editor';

@Component({
  selector: 'cadmus-word-form-set-editor',
  imports: [
    ReactiveFormsModule,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatIconButton,
    MatIcon,
    MatTooltip,
    FlatLookupPipe,
    WordFormEditor,
  ],
  templateUrl: './word-form-set-editor.html',
  styleUrl: './word-form-set-editor.css',
})
export class WordFormSetEditor {
  public readonly edited = signal<WordForm | undefined>(undefined);
  public readonly editedIndex = signal<number>(-1);

  public entries: FormControl<WordForm[]>;

  // lex-word-form-types
  public readonly typeEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-form-prefixes
  public readonly prefixEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-form-suffixes
  public readonly suffixEntries = input<ThesaurusEntry[] | undefined>();
  // lex-pos-tags
  public readonly posEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-form-features
  public readonly featureEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-form-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>();

  constructor(formBuilder: FormBuilder, private _dialogService: DialogService) {
    this.entries = formBuilder.control([], {
      nonNullable: true,
      validators: [NgxToolsValidators.strictMinLengthValidator(1)],
    });
  }

  public addForm(): void {
    const entry: WordForm = {
      type: this.typeEntries()?.[0]?.id ?? '',
      pos: this.posEntries()?.[0]?.id ?? '',
      value: '',
    };
    this.editForm(entry, -1);
  }

  public editForm(entry: WordForm, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(structuredClone(entry));
  }

  public closeForm(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveForm(entry: WordForm): void {
    const entries = [...this.entries.value];
    if (this.editedIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedIndex(), 1, entry);
    }
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
    this.closeForm();
  }

  public deleteForm(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete form?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex() === index) {
            this.closeForm();
          }
          const entries = [...this.entries.value];
          entries.splice(index, 1);
          this.entries.setValue(entries);
          this.entries.markAsDirty();
          this.entries.updateValueAndValidity();
        }
      });
  }

  public moveFormUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
  }

  public moveFormDown(index: number): void {
    if (index + 1 >= this.entries.value.length) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
  }
}
