import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';

import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { FlatLookupPipe } from '@myrmidon/ngx-tools';

import { WordForm } from '../../lex-lemma-part';
import { WordFormEditor } from '../word-form-editor/word-form-editor';

/**
 * Editor for a set of word forms.
 */
@Component({
  selector: 'cadmus-word-form-set-editor',
  imports: [
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatButton,
    MatIconButton,
    MatIcon,
    MatTooltip,
    FlatLookupPipe,
    WordFormEditor,
  ],
  templateUrl: './word-form-set-editor.html',
  styleUrl: './word-form-set-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordFormSetEditor {
  /**
   * The forms to edit.
   */
  public readonly forms = model<WordForm[]>([]);
  /**
   * The form being edited.
   */
  public readonly edited = signal<WordForm | undefined>(undefined);
  /**
   * The index of the form being edited, -1 if a new one.
   */
  public readonly editedIndex = signal<number>(-1);

  // lex-word-form-types
  public readonly typeEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-form-prefixes
  public readonly prefixEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-form-suffixes
  public readonly suffixEntries = input<ThesaurusEntry[] | undefined>();
  // lex-pos-tags (required)
  public readonly posEntries = input.required<ThesaurusEntry[]>();
  // lex-word-form-features
  public readonly featureEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-form-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>();

  constructor(private _dialogService: DialogService) {}

  public addForm(): void {
    const entry: WordForm = {
      type: this.typeEntries()?.[0]?.id ?? '',
      pos: this.posEntries()?.[0]?.id ?? '',
      value: '',
    };
    this.editedIndex.set(-1);
    this.edited.set(entry);
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
    const forms = [...this.forms()];
    if (this.editedIndex() === -1) {
      forms.push(entry);
    } else {
      forms.splice(this.editedIndex(), 1, entry);
    }
    this.forms.set(forms);
    this.closeForm();
  }

  public deleteForm(index: number): void {
    this._dialogService
      .confirm('Confirmation', `Delete form #${index + 1}?`)
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedIndex() === index) {
            this.closeForm();
          }
          const forms = [...this.forms()];
          forms.splice(index, 1);
          this.forms.set(forms);
        }
      });
  }

  public moveFormUp(index: number): void {
    if (index < 1) {
      return;
    }
    const form = this.forms()[index];
    const forms = [...this.forms()];
    forms.splice(index, 1);
    forms.splice(index - 1, 0, form);
    this.forms.set(forms);
  }

  public moveFormDown(index: number): void {
    if (index + 1 >= this.forms().length) {
      return;
    }
    const form = this.forms()[index];
    const forms = [...this.forms()];
    forms.splice(index, 1);
    forms.splice(index + 1, 0, form);
    this.forms.set(forms);
  }
}
