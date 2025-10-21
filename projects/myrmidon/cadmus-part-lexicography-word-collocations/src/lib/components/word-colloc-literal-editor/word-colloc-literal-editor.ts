import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, input, model, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesEntriesPickerComponent } from '@myrmidon/cadmus-ui';

import { WordCollocationLiteral } from '../../lex-word-collocations-part';

/**
 * Word collocation literal editor.
 */
@Component({
  selector: 'cadmus-word-colloc-literal-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ThesEntriesPickerComponent,
  ],
  templateUrl: './word-colloc-literal-editor.html',
  styleUrl: './word-colloc-literal-editor.css',
})
export class WordCollocLiteralEditor {
  public readonly literal = model<WordCollocationLiteral | undefined>();
  // lex-word-cliteral-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>();

  public readonly cancelEdit = output();

  public value: FormControl<string>;
  public tag: FormControl<ThesaurusEntry | null>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    // form
    this.value = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.tag = formBuilder.control(null);
    this.note = formBuilder.control(null, {
      validators: Validators.maxLength(1000),
    });
    this.form = formBuilder.group({
      value: this.value,
      tag: this.tag,
      note: this.note,
    });

    // when model changes, update form
    effect(() => {
      const data = this.literal();
      this.updateForm(data);
    });
  }

  public mapIdToEntry(
    id: string | null,
    entries: ThesaurusEntry[] | undefined
  ): ThesaurusEntry | null {
    if (!id) return null;
    if (!entries) return { id, value: id };
    return entries.find((e) => e.id === id) || { id, value: id };
  }

  private updateForm(data: WordCollocationLiteral | undefined | null): void {
    if (!data) {
      this.form.reset();
    } else {
      this.value.setValue(data.value);
      this.tag.setValue(data.tag ? this.mapIdToEntry(data.tag, this.tagEntries()) || null : null);
      this.note.setValue(data.note || null);
      this.form.markAsPristine();
    }
  }

  private getData(): WordCollocationLiteral {
    return {
      value: this.value.value.trim(),
      tag: this.tag.value?.id || undefined,
      note: this.note.value?.trim() || undefined,
    };
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

    const data = this.getData();
    this.literal.set(data);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
