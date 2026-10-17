import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, min } from '@angular/forms/signals';

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

import { FlatLookupPipe, NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { copyFormValue, isImplicitSubmission } from '@myrmidon/cadmus-ui';

import { WordCollocTokenEditor } from '../word-colloc-token-editor/word-colloc-token-editor';
import {
  WordCollocation,
  WordCollocationExampleToken,
  WordCollocationLiteral,
  WordCollocationToken,
} from '../../lex-word-collocations-part';
import { WordCollocExampleEditor } from '../word-colloc-example-editor/word-colloc-example-editor';

/**
 * The editable draft behind the form.
 */
interface WordCollocationControls {
  tag: string;
  rank: number | null;
  tokens: WordCollocationToken[];
  examples: WordCollocationExampleToken[];
  note: string;
}

function toDraft(collocation: WordCollocation | undefined): WordCollocationControls {
  return {
    tag: collocation?.tag || '',
    rank: collocation?.rank || 0,
    // copy: the form tags the objects in its arrays
    tokens: copyFormValue(collocation?.tokens || []),
    examples: copyFormValue(collocation?.examples || []),
    note: collocation?.note || '',
  };
}

function toData(draft: WordCollocationControls): WordCollocation {
  return {
    tag: draft.tag.trim() || undefined,
    rank: draft.rank || undefined,
    tokens: copyFormValue(draft.tokens),
    examples: draft.examples.length ? copyFormValue(draft.examples) : undefined,
    note: draft.note.trim() || undefined,
  };
}

@Component({
  selector: 'cadmus-word-colloc-editor',
  imports: [
    FormField,
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
  private readonly _dialogService = inject(DialogService);

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

  /**
   * The editable draft, derived from the bound collocation. On the echo of
   * our own save the draft is kept, so that normalization does not
   * overwrite it.
   */
  private readonly _draft = linkedSignal<WordCollocation | undefined, WordCollocationControls>({
    source: () => this.collocation(),
    computation: (collocation, previous) =>
      previous && JSON.stringify(collocation) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(collocation),
  });

  public readonly form = form(this._draft, (p) => {
    maxLength(p.tag, 100);
    min(p.rank, 0);
    NgxToolsSignalValidators.strictMinLength(p.tokens, 1);
    maxLength(p.note, 1000);
  });

  constructor() {
    // when the draft mirrors the bound collocation, there are no unsaved edits
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (JSON.stringify(draft) === JSON.stringify(toDraft(this.collocation()))) {
          this.form().reset();
        }
      });
    });
  }

  // these are user actions: they set the list and mark it as dirty
  private setTokens(tokens: WordCollocationToken[]): void {
    this.form.tokens().value.set(tokens);
    this.form.tokens().markAsDirty();
  }

  private setExamples(examples: WordCollocationExampleToken[]): void {
    this.form.examples().value.set(examples);
    this.form.examples().markAsDirty();
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
    // structuredClone also drops the form's Symbol tag
    this.editedToken.set(structuredClone(token));
  }

  public closeToken(): void {
    this.editedTokenIndex.set(-1);
    this.editedToken.set(undefined);
  }

  public saveToken(entry: WordCollocationToken): void {
    const entries = [...this.form.tokens().value()];
    if (this.editedTokenIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedTokenIndex(), 1, entry);
    }
    this.setTokens(entries);
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
          const tokens = [...this.form.tokens().value()];
          tokens.splice(index, 1);
          this.setTokens(tokens);
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
    const token = this.form.tokens().value()[index];
    const tokens = [...this.form.tokens().value()];
    tokens.splice(index, 1);
    tokens.splice(index - 1, 0, token);
    this.setTokens(tokens);
    this.onTokensSwapped(index, index - 1);
  }

  public moveTokenDown(index: number): void {
    if (index + 1 >= this.form.tokens().value().length) {
      return;
    }
    const token = this.form.tokens().value()[index];
    const tokens = [...this.form.tokens().value()];
    tokens.splice(index, 1);
    tokens.splice(index + 1, 0, token);
    this.setTokens(tokens);
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
    const examples = this.form
      .examples()
      .value()
      .map((e) => {
        const tokenNr = map(e.tokenNr);
        if (tokenNr === e.tokenNr) {
          return e;
        }
        changed = true;
        // a new object: do not spread the form's own one
        return { tokenNr, literals: copyFormValue(e.literals) };
      });
    if (changed) {
      this.setExamples(examples);
    }
  }
  //#endregion

  //#region Examples
  public addExample(): void {
    // default to the pattern token following the last example's one
    const lastNr = this.form.examples().value().at(-1)?.tokenNr ?? 0;
    const example: WordCollocationExampleToken = {
      tokenNr: Math.min(lastNr + 1, this.form.tokens().value().length),
      literals: [],
    };
    this.editExample(example, -1);
  }

  public editExample(example: WordCollocationExampleToken, index: number): void {
    this.editedExampleIndex.set(index);
    // structuredClone also drops the form's Symbol tag
    this.editedExample.set(structuredClone(example));
  }

  public closeExample(): void {
    this.editedExampleIndex.set(-1);
    this.editedExample.set(undefined);
  }

  public onExampleChange(example: WordCollocationExampleToken): void {
    const examples = [...this.form.examples().value()];
    if (this.editedExampleIndex() === -1) {
      examples.push(example);
    } else {
      examples.splice(this.editedExampleIndex(), 1, example);
    }
    this.setExamples(examples);
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
          const examples = [...this.form.examples().value()];
          examples.splice(index, 1);
          this.setExamples(examples);
        }
      });
  }

  public moveExampleUp(index: number): void {
    if (index < 1) {
      return;
    }
    const example = this.form.examples().value()[index];
    const examples = [...this.form.examples().value()];
    examples.splice(index, 1);
    examples.splice(index - 1, 0, example);
    this.setExamples(examples);
    this.followMovedExample(index, index - 1);
  }

  public moveExampleDown(index: number): void {
    if (index + 1 >= this.form.examples().value().length) {
      return;
    }
    const example = this.form.examples().value()[index];
    const examples = [...this.form.examples().value()];
    examples.splice(index, 1);
    examples.splice(index + 1, 0, example);
    this.setExamples(examples);
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
   * Handle Enter in a text input, like the submission of a form: save when
   * changed, or show the errors when invalid. The event is consumed in any
   * case, so that it does not reach an enclosing editor. An Enter in the
   * nested example editor is consumed by that editor.
   * @param event The keydown event.
   */
  public onEnterKey(event: Event): void {
    if (!isImplicitSubmission(event)) {
      return;
    }
    event.preventDefault();
    if (this.form().dirty()) {
      this.save();
    }
  }

  /**
   * Save the current draft into the `collocation` model signal.
   * @param pristine If true (default), the form's interaction state is
   * cleared after saving.
   */
  public save(pristine = true): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }

    this.collocation.set(toData(this._draft()));

    if (pristine) {
      this.form().reset();
    }
  }
}
