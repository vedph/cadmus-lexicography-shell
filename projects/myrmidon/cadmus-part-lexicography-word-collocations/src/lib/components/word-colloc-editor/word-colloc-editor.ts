import { ChangeDetectionStrategy, Component, effect, input, model, output, signal } from '@angular/core';
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
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';

import { FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { WordCollocTokenEditor } from '../word-colloc-token-editor/word-colloc-token-editor';
import {
  WordCollocation,
  WordCollocationExampleToken,
  WordCollocationLiteral,
  WordCollocationToken,
} from '../../lex-word-collocations-part';
import { WordCollocExampleEditor } from '../word-colloc-example-editor/word-colloc-example-editor';

@Component({
  selector: 'cadmus-word-colloc-editor',
  imports: [
    ReactiveFormsModule,
    MatButton,
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
    MatTooltip,
    WordCollocTokenEditor,
    WordCollocExampleEditor,
    FlatLookupPipe,
  ],
  templateUrl: './word-colloc-editor.html',
  styleUrl: './word-colloc-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  public readonly editedExample = signal<WordCollocationExampleToken | undefined>(undefined);
  public readonly editedExampleIndex = signal<number>(-1);

  public tag: FormControl<string | null>;
  public rank: FormControl<number>;
  public tokens: FormControl<WordCollocationToken[]>;
  public examples: FormControl<WordCollocationExampleToken[]>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
  ) {
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
      note: this.note.value?.trim() || undefined,
    };
  }

  //#region Tokens
  public addToken(): void {
    const token: WordCollocationToken = {
      pos: this.tokPosEntries()?.[0]?.id || '',
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
          // keep the edited token index in sync with the list
          const edited = this.editedTokenIndex();
          if (edited === index) {
            this.closeToken();
          } else if (edited > index) {
            this.editedTokenIndex.set(edited - 1);
          }
          const tokens = [...this.tokens.value];
          tokens.splice(index, 1);
          this.tokens.setValue(tokens);
          this.tokens.markAsDirty();
          this.tokens.updateValueAndValidity();
          // examples referring to the deleted token become connective text,
          // and those referring to the following tokens are renumbered
          const nr = index + 1;
          this.remapExampleTokens((n) => (n === nr ? 0 : n > nr ? n - 1 : n));
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
    this.onTokensSwapped(index, index - 1);
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
    this.onTokensSwapped(index, index + 1);
  }

  /**
   * Keep the edited token index and the examples referring to tokens
   * in sync after the token at index a has been swapped with the one
   * at index b.
   */
  private onTokensSwapped(a: number, b: number): void {
    if (this.editedTokenIndex() === a) {
      this.editedTokenIndex.set(b);
    } else if (this.editedTokenIndex() === b) {
      this.editedTokenIndex.set(a);
    }
    const [nrA, nrB] = [a + 1, b + 1];
    this.remapExampleTokens((n) => (n === nrA ? nrB : n === nrB ? nrA : n));
  }

  /**
   * Remap the pattern token numbers referred to by examples.
   * @param map The function mapping an old token number to the new one.
   */
  private remapExampleTokens(map: (tokenNr: number) => number): void {
    let changed = false;
    const examples = this.examples.value.map((e) => {
      const tokenNr = map(e.tokenNr);
      if (tokenNr === e.tokenNr) {
        return e;
      }
      changed = true;
      return { ...e, tokenNr };
    });
    if (changed) {
      this.examples.setValue(examples);
      this.examples.markAsDirty();
      this.examples.updateValueAndValidity();
    }
  }
  //#endregion

  //#region Examples
  public addExample(): void {
    // default to the pattern token following the last example's one
    const lastNr = this.examples.value.at(-1)?.tokenNr ?? 0;
    const example: WordCollocationExampleToken = {
      tokenNr: Math.min(lastNr + 1, this.tokens.value.length),
      literals: [],
    };
    this.editExample(example, -1);
  }

  public editExample(example: WordCollocationExampleToken, index: number): void {
    this.editedExampleIndex.set(index);
    this.editedExample.set(structuredClone(example));
  }

  public closeExample(): void {
    this.editedExampleIndex.set(-1);
    this.editedExample.set(undefined);
  }

  public onExampleChange(example: WordCollocationExampleToken): void {
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
          // keep the edited example index in sync with the list
          const edited = this.editedExampleIndex();
          if (edited === index) {
            this.closeExample();
          } else if (edited > index) {
            this.editedExampleIndex.set(edited - 1);
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
    this.followMovedExample(index, index - 1);
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
    this.followMovedExample(index, index + 1);
  }

  /**
   * Keep the edited example index in sync with the list after the example
   * at index from has been swapped with the one at index to.
   */
  private followMovedExample(from: number, to: number): void {
    if (this.editedExampleIndex() === from) {
      this.editedExampleIndex.set(to);
    } else if (this.editedExampleIndex() === to) {
      this.editedExampleIndex.set(from);
    }
  }
  //#endregion

  getLiteralValues(literals: WordCollocationLiteral[]) {
    return literals?.map((l) => l.value).join('; ') ?? '';
  }

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
