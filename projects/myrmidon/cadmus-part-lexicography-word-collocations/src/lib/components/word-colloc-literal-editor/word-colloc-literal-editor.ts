import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  output,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { isImplicitSubmission } from '@myrmidon/cadmus-ui';
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';

import { WordCollocationLiteral } from '../../lex-word-collocations-part';

/**
 * The editable draft behind the form. The tag is either picked from the
 * thesaurus (its entry ID), or typed when there is no thesaurus.
 */
interface WordCollocationLiteralControls {
  value: string;
  tag: string;
  note: string;
}

function toDraft(literal: WordCollocationLiteral | undefined): WordCollocationLiteralControls {
  return {
    value: literal?.value || '',
    tag: literal?.tag || '',
    note: literal?.note || '',
  };
}

function toData(draft: WordCollocationLiteralControls): WordCollocationLiteral {
  return {
    value: draft.value.trim(),
    tag: draft.tag.trim() || undefined,
    note: draft.note.trim() || undefined,
  };
}

/**
 * Word collocation literal editor.
 */
@Component({
  selector: 'cadmus-word-colloc-literal-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ThesaurusEntriesPickerComponent,
  ],
  templateUrl: './word-colloc-literal-editor.html',
  styleUrl: './word-colloc-literal-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordCollocLiteralEditor {
  public readonly literal = model<WordCollocationLiteral | undefined>();
  // lex-word-cliteral-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>();

  public readonly cancelEdit = output();

  /**
   * The editable draft, derived from the bound literal. On the echo of our
   * own save the draft is kept, so that normalization does not overwrite it.
   */
  private readonly _draft = linkedSignal<
    WordCollocationLiteral | undefined,
    WordCollocationLiteralControls
  >({
    source: () => this.literal(),
    computation: (literal, previous) =>
      previous && JSON.stringify(literal) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(literal),
  });

  public readonly form = form(this._draft, (p) => {
    required(p.value);
    maxLength(p.value, 100);
    // only a typed tag is limited
    maxLength(p.tag, () => (this.tagEntries()?.length ? undefined : 50));
    maxLength(p.note, 1000);
  });

  // the entries for the tag picker
  public readonly pickedTag = computed<ThesaurusEntry[]>(() => {
    const id = this.form.tag().value();
    return id ? [this.tagEntries()?.find((e) => e.id === id) || { id, value: id }] : [];
  });

  constructor() {
    // when the draft mirrors the bound literal, there are no unsaved edits
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (JSON.stringify(draft) === JSON.stringify(toDraft(this.literal()))) {
          this.form().reset();
        }
      });
    });
  }

  public onTagEntriesChange(entries: ThesaurusEntry[]): void {
    this.form.tag().value.set(entries[0]?.id ?? '');
    this.form.tag().markAsDirty();
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Handle Enter in a text input, like the submission of a form: save when
   * changed, or show the errors when invalid. The event is consumed in any
   * case, so that it does not reach the enclosing example editor.
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
   * Save the current draft into the `literal` model signal.
   * @param pristine If true (default), the form's interaction state is
   * cleared after saving.
   */
  public save(pristine = true): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }

    this.literal.set(toData(this._draft()));

    if (pristine) {
      this.form().reset();
    }
  }
}
