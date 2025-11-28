import { Component, effect, input, model, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';

import { EllipsisPipe, FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { WordCollocTokenEditor } from '../word-colloc-token-editor/word-colloc-token-editor';
import {
  WordCollocation,
  WordCollocationExample,
  WordCollocationToken,
} from '../../lex-word-collocations-part';
import { WordCollocExampleEditor } from '../word-colloc-example-editor/word-colloc-example-editor';

@Component({
  selector: 'cadmus-word-colloc-editor',
  imports: [
    ReactiveFormsModule,
    MatError,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatOption,
    MatLabel,
    MatSelect,
    WordCollocTokenEditor,
    WordCollocExampleEditor,
    FlatLookupPipe,
    EllipsisPipe,
  ],
  templateUrl: './word-colloc-editor.html',
  styleUrl: './word-colloc-editor.css',
})
export class WordCollocEditor {
  public readonly collocation = model<WordCollocation | undefined>();
  public readonly cancelEdit = output();

  // lex-word-ctoken-pos-tags (required)
  public readonly tokPosEntries = input.required<ThesaurusEntry[] | undefined>();
  // lex-word-collocation-tags
  public readonly collTagEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-ctoken-features
  public readonly tokFeatureEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-cliteral-tags
  public readonly litTagEntries = input<ThesaurusEntry[] | undefined>();

  public readonly editedToken = signal<WordCollocationToken | undefined>(undefined);
  public readonly editedTokenIndex = signal<number>(-1);

  public readonly editedExample = signal<WordCollocationExample | undefined>(undefined);
  public readonly editedExampleIndex = signal<number>(-1);

  public tag: FormControl<string | null>;
  public rank: FormControl<number>;
  public tokens: FormControl<WordCollocationToken[]>;
  public examples: FormControl<WordCollocationExample[]>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder, private _dialogService: DialogService) {
    this.tag = formBuilder.control(null, Validators.maxLength(100));
    this.rank = formBuilder.control(0, { nonNullable: true });
    this.tokens = formBuilder.control([], {
      nonNullable: true,
      validators: [NgxToolsValidators.strictMinLengthValidator(1)],
    });
    this.examples = formBuilder.control([], { nonNullable: true });
    this.note = formBuilder.control(null, Validators.maxLength(1000));
    this.form = formBuilder.group({
      tag: this.tag,
      rank: this.rank,
      tokens: this.tokens,
      examples: this.examples,
      note: this.note,
    });

    // when model changes, update form
    effect(() => {
      const data = this.collocation();
      this.updateForm(data);
    });
  }

  private updateForm(data: WordCollocation | undefined | null): void {
    if (!data) {
      this.form.reset();
    } else {
      this.tag.setValue(data.tag || null);
      this.rank.setValue(data.rank || 0);
      this.tokens.setValue(data.tokens || []);
      this.examples.setValue(data.examples || []);
      this.note.setValue(data.note || null);
      this.form.markAsPristine();
    }
  }

  private getCollocation(): WordCollocation {
    return {
      tag: this.tag.value || undefined,
      rank: this.rank.value || undefined,
      tokens: this.tokens.value,
      examples: this.examples.value.length ? this.examples.value : undefined,
      note: this.note.value || undefined,
    };
  }

  //#region Tokens
  public addToken(): void {
    const entries: ThesaurusEntry[] = this.tokPosEntries()!;
    const token: WordCollocationToken = {
      pos: entries[0]?.id || '',
    };
    this.editToken(token, -1);
  }

  public editToken(token: WordCollocationToken, index: number): void {
    this.editedTokenIndex.set(index);
    this.editedToken.set(structuredClone(token));
  }

  public closeToken(): void {
    this.editedTokenIndex.set(-1);
    this.editedToken.set(undefined);
  }

  public saveToken(entry: WordCollocationToken): void {
    const entries = [...this.tokens.value];
    if (this.editedTokenIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedTokenIndex(), 1, entry);
    }
    this.tokens.setValue(entries);
    this.tokens.markAsDirty();
    this.tokens.updateValueAndValidity();
    this.closeToken();
  }

  public deleteToken(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete token?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedTokenIndex() === index) {
            this.closeToken();
          }
          const tokens = [...this.tokens.value];
          tokens.splice(index, 1);
          this.tokens.setValue(tokens);
          this.tokens.markAsDirty();
          this.tokens.updateValueAndValidity();
        }
      });
  }

  public moveTokenUp(index: number): void {
    if (index < 1) {
      return;
    }
    const token = this.tokens.value[index];
    const tokens = [...this.tokens.value];
    tokens.splice(index, 1);
    tokens.splice(index - 1, 0, token);
    this.tokens.setValue(tokens);
    this.tokens.markAsDirty();
    this.tokens.updateValueAndValidity();
  }

  public moveTokenDown(index: number): void {
    if (index + 1 >= this.tokens.value.length) {
      return;
    }
    const token = this.tokens.value[index];
    const tokens = [...this.tokens.value];
    tokens.splice(index, 1);
    tokens.splice(index + 1, 0, token);
    this.tokens.setValue(tokens);
    this.tokens.markAsDirty();
    this.tokens.updateValueAndValidity();
  }
  //#endregion

  //#region Examples
  public addExample(): void {
    const example: WordCollocationExample = {
      tokenNr: this.tokens.value.length + 1,
      literals: [],
    };
    this.editExample(example, -1);
  }

  public editExample(example: WordCollocationExample, index: number): void {
    this.editedExampleIndex.set(index);
    this.editedExample.set(structuredClone(example));
  }

  public closeExample(): void {
    this.editedExampleIndex.set(-1);
    this.editedExample.set(undefined);
  }

  public saveExample(example: WordCollocationExample): void {
    const examples = [...this.examples.value];
    if (this.editedExampleIndex() === -1) {
      examples.push(example);
    } else {
      examples.splice(this.editedExampleIndex(), 1, example);
    }
    this.examples.setValue(examples);
    this.examples.markAsDirty();
    this.examples.updateValueAndValidity();
    this.closeExample();
  }

  public deleteExample(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete example?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          if (this.editedExampleIndex() === index) {
            this.closeExample();
          }
          const examples = [...this.examples.value];
          examples.splice(index, 1);
          this.examples.setValue(examples);
          this.examples.markAsDirty();
          this.examples.updateValueAndValidity();
        }
      });
  }

  public moveExampleUp(index: number): void {
    if (index < 1) {
      return;
    }
    const example = this.examples.value[index];
    const examples = [...this.examples.value];
    examples.splice(index, 1);
    examples.splice(index - 1, 0, example);
    this.examples.setValue(examples);
    this.examples.markAsDirty();
    this.examples.updateValueAndValidity();
  }

  public moveExampleDown(index: number): void {
    if (index + 1 >= this.examples.value.length) {
      return;
    }
    const example = this.examples.value[index];
    const examples = [...this.examples.value];
    examples.splice(index, 1);
    examples.splice(index + 1, 0, example);
    this.examples.setValue(examples);
    this.examples.markAsDirty();
    this.examples.updateValueAndValidity();
  }
  //#endregion

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Saves the current form data by updating the `data` model signal.
   * This method can be called manually (e.g., by a Save button) or
   * automatically (via auto-save).
   * @param pristine If true (default), the form is marked as pristine
   * after saving.
   * Set to false for auto-save if you want the form to remain dirty.
   */
  public save(pristine = true): void {
    if (this.form.invalid) {
      // show validation errors
      this.form.markAllAsTouched();
      return;
    }

    const collocation = this.getCollocation();
    this.collocation.set(collocation);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
