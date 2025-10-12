import { CommonModule } from '@angular/common';
import { Component, effect, input, model, output, signal } from '@angular/core';
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

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesEntriesPickerComponent } from '@myrmidon/cadmus-ui';

import { WordForm } from '../../lex-lemma-part';

@Component({
  selector: 'cadmus-word-form-editor',
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
  templateUrl: './word-form-editor.html',
  styleUrl: './word-form-editor.css',
})
export class WordFormEditor {
  public readonly form = model<WordForm | undefined>();
  public readonly cancelEdit = output();

  // the current POS entry as a ThesaurusEntry, used when posEntries is set
  // instead of a string
  public readonly posEntry = signal<ThesaurusEntry | undefined>(undefined);

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

  public type: FormControl<string>;
  public prefix: FormControl<string | null>;
  public value: FormControl<string>;
  public suffix: FormControl<string | null>;
  public pos: FormControl<string>;
  public features: FormControl<ThesaurusEntry[]>;
  public tags: FormControl<ThesaurusEntry[]>;
  public note: FormControl<string | null>;
  public formCtl: FormGroup;

  constructor(formBuilder: FormBuilder) {
    // form
    this.type = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    });
    this.prefix = formBuilder.control(null, { validators: [Validators.maxLength(50)] });
    this.value = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    });
    this.suffix = formBuilder.control(null, { validators: [Validators.maxLength(50)] });
    this.pos = formBuilder.control('', {
      nonNullable: true,
      validators: [
        // required only if no posEntries are provided (i.e. pos is a free text string)
        NgxToolsValidators.conditionalValidator(
          () => !this.posEntries()?.length,
          Validators.required
        ),
        Validators.maxLength(100),
      ],
    });
    this.features = formBuilder.control([], { nonNullable: true });
    this.tags = formBuilder.control([], { nonNullable: true });
    this.note = formBuilder.control(null);
    this.formCtl = formBuilder.group({
      type: this.type,
      prefix: this.prefix,
      value: this.value,
      suffix: this.suffix,
      pos: this.pos,
      features: this.features,
      tags: this.tags,
      note: this.note,
    });

    // when model changes, update form
    effect(() => {
      const data = this.form();
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

  private mapIdToEntries(ids: string[], entries: ThesaurusEntry[] | undefined): ThesaurusEntry[] {
    if (!entries) return ids.map((id) => ({ id, value: id }));
    return ids.map((id) => entries.find((e) => e.id === id) || { id, value: id });
  }

  private updateForm(data: WordForm | undefined | null): void {
    if (!data) {
      this.posEntry.set(undefined);
      this.formCtl.reset();
    } else {
      if (this.posEntries()?.length) {
        this.posEntry.set(this.mapIdToEntry(data.pos, this.posEntries())!);
      }
      this.type.setValue(data.type || '');
      this.prefix.setValue(data.prefix || null);
      this.value.setValue(data.value || '');
      this.suffix.setValue(data.suffix || null);
      this.pos.setValue(data.pos || '');
      this.features.setValue(this.mapIdToEntries(data.features || [], this.featureEntries()));
      this.tags.setValue(this.mapIdToEntries(data.tags || [], this.tagEntries()));
      this.note.setValue(data.note || null);
      this.formCtl.markAsPristine();
    }
  }

  public onFeatureEntriesChange(entries: ThesaurusEntry[]): void {
    this.features.setValue(entries);
    this.features.markAsDirty();
    this.features.updateValueAndValidity();
  }

  public onTagEntriesChange(entries: ThesaurusEntry[]): void {
    this.tags.setValue(entries);
    this.tags.markAsDirty();
    this.tags.updateValueAndValidity();
  }

  private getData(): WordForm {
    return {
      type: this.type.value,
      prefix: this.prefix.value || undefined,
      value: this.value.value,
      suffix: this.suffix.value || undefined,
      pos: (this.posEntries()?.length ? this.posEntry()?.id : this.pos.value) || '',
      features: this.features.value.map((e) => e.id),
      tags: this.tags.value.map((e) => e.id),
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
    if (this.formCtl.invalid) {
      // show validation errors
      this.formCtl.markAllAsTouched();
      return;
    }

    const data = this.getData();
    this.form.set(data);

    if (pristine) {
      this.formCtl.markAsPristine();
    }
  }
}
