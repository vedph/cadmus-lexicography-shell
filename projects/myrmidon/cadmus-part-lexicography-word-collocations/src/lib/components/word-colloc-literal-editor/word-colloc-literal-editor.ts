import { ChangeDetectionStrategy, Component, effect, input, model, output } from '@angular/core';
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
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';

import { WordCollocationLiteral } from '../../lex-word-collocations-part';

/**
 * Word collocation literal editor.
 */
@Component({
  selector: 'cadmus-word-colloc-literal-editor',
  imports: [
    ReactiveFormsModule,
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

  public value: FormControl<string>;
  // the tag when picked from thesaurus entries
  public tag: FormControl<ThesaurusEntry | null>;
  // the tag when typed (no thesaurus entries)
  public tagText: FormControl<string | null>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    // form
    this.value = formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.tag = formBuilder.control(null);
    this.tagText = formBuilder.control(null, Validators.maxLength(50));
    this.note = formBuilder.control(null, {
      validators: Validators.maxLength(1000),
    });
    this.form = formBuilder.group({
      value: this.value,
      tag: this.tag,
      tagText: this.tagText,
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

  public onTagEntriesChange(entries: ThesaurusEntry[]): void {
    this.tag.setValue(entries.length ? entries[0] : null);
    this.tag.markAsDirty();
    this.tag.updateValueAndValidity();
  }

  private updateForm(data: WordCollocationLiteral | undefined | null): void {
    if (!data) {
      this.form.reset();
    } else {
      this.value.setValue(data.value);
      this.tag.setValue(data.tag ? this.mapIdToEntry(data.tag, this.tagEntries()) || null : null);
      this.tagText.setValue(data.tag || null);
      this.note.setValue(data.note || null);
      this.form.markAsPristine();
    }
  }

  private getData(): WordCollocationLiteral {
    return {
      value: this.value.value.trim(),
      tag:
        (this.tagEntries()?.length ? this.tag.value?.id : this.tagText.value?.trim()) || undefined,
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
