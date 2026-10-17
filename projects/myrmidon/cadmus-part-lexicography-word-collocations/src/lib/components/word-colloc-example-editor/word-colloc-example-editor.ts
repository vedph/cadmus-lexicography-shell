import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  untracked,
} from '@angular/core';
import { FormField, form, max, min, required, validate } from '@angular/forms/signals';

import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';

import { FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { copyFormValue, isImplicitSubmission } from '@myrmidon/cadmus-ui';

import { WordCollocationExampleToken, WordCollocationLiteral } from '../../lex-word-collocations-part';
import { WordCollocLiteralEditor } from '../word-colloc-literal-editor/word-colloc-literal-editor';

/**
 * The editable draft behind the form.
 */
interface WordCollocationExampleControls {
  tokenNr: number | null;
  literals: WordCollocationLiteral[];
}

function toDraft(example: WordCollocationExampleToken): WordCollocationExampleControls {
  return {
    tokenNr: example.tokenNr,
    // copy: the form tags the objects in its arrays
    literals: copyFormValue(example.literals || []),
  };
}

function toData(draft: WordCollocationExampleControls): WordCollocationExampleToken {
  return {
    tokenNr: draft.tokenNr ?? 0,
    literals: copyFormValue(draft.literals),
  };
}

/**
 * Word collocation example token editor. This edits the token reference
 * number and the literals collection for the edited example token.
 */
@Component({
  selector: 'cadmus-word-colloc-example-editor',
  imports: [
    FormField,
    MatButton,
    MatError,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatFormField,
    MatHint,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatTooltip,
    FlatLookupPipe,
    WordCollocLiteralEditor,
  ],
  templateUrl: './word-colloc-example-editor.html',
  styleUrl: './word-colloc-example-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordCollocExampleEditor {
  private readonly _dialogService = inject(DialogService);

  /**
   * Maximum token number. When 0 no limit is set.
   */
  public readonly maxTokenNr = input<number>(0);
  /**
   * The lex-word-cliteral-tags thesaurus entries.
   */
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>(undefined);
  /**
   * The example to edit.
   */
  public readonly example = model<WordCollocationExampleToken>({ tokenNr: 1, literals: [] });

  // the literal being edited, and its index (-1 for a new one): a literal
  // being edited belongs to the example, so they are reset when it changes
  public readonly edited = linkedSignal<
    WordCollocationExampleToken,
    WordCollocationLiteral | undefined
  >({
    source: () => this.example(),
    computation: () => undefined,
  });
  public readonly editedIndex = linkedSignal<WordCollocationExampleToken, number>({
    source: () => this.example(),
    computation: () => -1,
  });

  /**
   * The editable draft, derived from the bound example. On the echo of our
   * own save the draft is kept, so that normalization does not overwrite it.
   */
  private readonly _draft = linkedSignal<
    WordCollocationExampleToken,
    WordCollocationExampleControls
  >({
    source: () => this.example(),
    computation: (example, previous) =>
      previous && JSON.stringify(example) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(example),
  });

  // 0=connective text, 1-N=pattern token number
  public readonly form = form(this._draft, (p) => {
    required(p.tokenNr);
    min(p.tokenNr, 0);
    max(p.tokenNr, () => this.maxTokenNr() || undefined);
    validate(p.literals, ({ value }) => (value().length ? null : { kind: 'required' }));
  });

  /**
   * Event emitted when the edit is cancelled.
   */
  public readonly cancelEdit = output();

  constructor() {
    // when the draft mirrors the bound example, there are no unsaved edits
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (JSON.stringify(draft) === JSON.stringify(toDraft(this.example()))) {
          this.form().reset();
        }
      });
    });
  }

  public addLiteral(): void {
    const literal: WordCollocationLiteral = {
      value: '',
    };
    this.editedIndex.set(-1);
    this.edited.set(literal);
  }

  public editLiteral(literal: WordCollocationLiteral, index: number): void {
    this.editedIndex.set(index);
    // structuredClone also drops the form's Symbol tag
    this.edited.set(structuredClone(literal));
  }

  public closeLiteral(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  // these are user actions: they set the list and mark it as dirty
  private setLiterals(literals: WordCollocationLiteral[]): void {
    this.form.literals().value.set(literals);
    this.form.literals().markAsDirty();
  }

  public saveLiteral(literal: WordCollocationLiteral): void {
    const literals = [...this.form.literals().value()];
    if (this.editedIndex() === -1) {
      literals.push(literal);
    } else {
      literals.splice(this.editedIndex(), 1, literal);
    }
    this.setLiterals(literals);
    this.closeLiteral();
  }

  public deleteLiteral(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete literal?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          // keep the edited literal index in sync with the list
          const edited = this.editedIndex();
          if (edited === index) {
            this.closeLiteral();
          } else if (edited > index) {
            this.editedIndex.set(edited - 1);
          }
          const literals = [...this.form.literals().value()];
          literals.splice(index, 1);
          this.setLiterals(literals);
        }
      });
  }

  public moveLiteralUp(index: number): void {
    if (index < 1) {
      return;
    }
    const literals = [...this.form.literals().value()];
    const literal = literals[index];
    literals.splice(index, 1);
    literals.splice(index - 1, 0, literal);
    this.setLiterals(literals);
    this.followMovedLiteral(index, index - 1);
  }

  public moveLiteralDown(index: number): void {
    const literals = [...this.form.literals().value()];
    if (index + 1 >= literals.length) {
      return;
    }
    const literal = literals[index];
    literals.splice(index, 1);
    literals.splice(index + 1, 0, literal);
    this.setLiterals(literals);
    this.followMovedLiteral(index, index + 1);
  }

  /**
   * Keep the edited literal index in sync with the list after the literal
   * at index from has been swapped with the one at index to.
   */
  private followMovedLiteral(from: number, to: number): void {
    if (this.editedIndex() === from) {
      this.editedIndex.set(to);
    } else if (this.editedIndex() === to) {
      this.editedIndex.set(from);
    }
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Handle Enter in a text input, like the submission of a form: save when
   * changed, or show the errors when invalid. The event is consumed in any
   * case, so that it does not reach the enclosing collocation editor. An
   * Enter in the nested literal editor is consumed by that editor.
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

  public save(): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }
    this.example.set(toData(this._draft()));
    this.form().reset();
  }
}
