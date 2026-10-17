import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

import { WordCollocationExampleToken, WordCollocationLiteral } from '../../lex-word-collocations-part';
import { WordCollocLiteralEditor } from '../word-colloc-literal-editor/word-colloc-literal-editor';

/**
 * Word collocation example token editor. This edits the token reference
 * number and the literals collection for the edited example token.
 */
@Component({
  selector: 'cadmus-word-colloc-example-editor',
  imports: [
    ReactiveFormsModule,
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

  public readonly literals = computed<WordCollocationLiteral[]>(() => this.example().literals);
  public readonly editedLiterals = linkedSignal<WordCollocationLiteral[]>(this.literals);
  public readonly edited = signal<WordCollocationLiteral | undefined>(undefined);
  public readonly editedIndex = signal<number>(-1);
  public readonly dirty = signal<boolean>(false);

  /**
   * Event emitted when the edit is cancelled.
   */
  public readonly cancelEdit = output();

  public tokenNr: FormControl<number>;

  constructor(private _dialogService: DialogService) {
    // 0=connective text, 1-N=pattern token number
    this.tokenNr = new FormControl<number>(this.example().tokenNr, {
      nonNullable: true,
      validators: [Validators.min(0)],
    });

    // when the example changes, update the form
    effect(() => {
      const example = this.example();
      untracked(() => {
        this.closeLiteral();
        this.tokenNr.setValue(example.tokenNr, { emitEvent: false });
        this.tokenNr.markAsPristine();
        this.dirty.set(false);
      });
    });

    // when maxTokenNr changes, update the max validator
    effect(() => {
      const max = this.maxTokenNr();
      this.tokenNr.clearValidators();
      this.tokenNr.addValidators(Validators.min(0));
      if (max > 0) {
        this.tokenNr.addValidators(Validators.max(max));
      }
      // just revalidate: this is not a user change
      this.tokenNr.updateValueAndValidity({ emitEvent: false });
    });

    // when tokenNr changes, set dirty
    this.tokenNr.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.dirty.set(true);
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
    this.edited.set(structuredClone(literal));
  }

  public closeLiteral(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveLiteral(literal: WordCollocationLiteral): void {
    const literals = [...this.editedLiterals()];
    if (this.editedIndex() === -1) {
      literals.push(literal);
    } else {
      literals.splice(this.editedIndex(), 1, literal);
    }
    this.editedLiterals.set(literals);
    this.closeLiteral();
    this.dirty.set(true);
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
          const literals = [...this.editedLiterals()];
          literals.splice(index, 1);
          this.editedLiterals.set(literals);
          this.dirty.set(true);
        }
      });
  }

  public moveLiteralUp(index: number): void {
    if (index < 1) {
      return;
    }
    const literal = this.editedLiterals()[index];
    const literals = [...this.editedLiterals()];
    literals.splice(index, 1);
    literals.splice(index - 1, 0, literal);
    this.editedLiterals.set(literals);
    this.followMovedLiteral(index, index - 1);
    this.dirty.set(true);
  }

  public moveLiteralDown(index: number): void {
    if (index + 1 >= this.editedLiterals().length) {
      return;
    }
    const literal = this.editedLiterals()[index];
    const literals = [...this.editedLiterals()];
    literals.splice(index, 1);
    literals.splice(index + 1, 0, literal);
    this.editedLiterals.set(literals);
    this.followMovedLiteral(index, index + 1);
    this.dirty.set(true);
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

  private getExample(): WordCollocationExampleToken {
    return {
      tokenNr: this.tokenNr.value,
      literals: this.editedLiterals(),
    };
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  public save(): void {
    if (!this.tokenNr.valid || !this.editedLiterals().length) {
      return;
    }
    this.tokenNr.markAsPristine();
    this.dirty.set(false);
    this.example.set(this.getExample());
  }
}
