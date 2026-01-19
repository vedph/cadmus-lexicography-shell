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
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';

import { WordForm } from '../../lex-lemma-part';

@Component({
  selector: 'cadmus-word-form-editor',
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
  templateUrl: './word-form-editor.html',
  styleUrl: './word-form-editor.css',
})
export class WordFormEditor {
  public readonly form = model<WordForm | undefined>();
  public readonly cancelEdit = output();

  // lex-word-form-types
  public readonly typeEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-form-prefixes
  public readonly prefixEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-form-suffixes
  public readonly suffixEntries = input<ThesaurusEntry[] | undefined>();
  // lex-pos-tags
  public readonly posEntries = input.required<ThesaurusEntry[]>();
  // lex-word-form-features
  public readonly featureEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-form-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>();

  public type: FormControl<string>;
  public prefix: FormControl<string | null>;
  public value: FormControl<string>;
  public suffix: FormControl<string | null>;
  public pos: FormControl<ThesaurusEntry>;
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
    this.pos = formBuilder.control(
      { id: '', value: '' },
      {
        nonNullable: true,
        validators: Validators.required,
      }
    );
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

  private mapIdsToEntries(ids: string[], entries: ThesaurusEntry[] | undefined): ThesaurusEntry[] {
    if (!entries) return ids.map((id) => ({ id, value: id }));
    return ids.map((id) => entries.find((e) => e.id === id) || { id, value: id });
  }

  private updateForm(data: WordForm | undefined | null): void {
    if (!data) {
      this.formCtl.reset();
    } else {
      this.type.setValue(data.type || '');
      this.prefix.setValue(data.prefix || null);
      this.value.setValue(data.value || '');
      this.suffix.setValue(data.suffix || null);
      this.pos.setValue(this.mapIdToEntry(data.pos, this.posEntries()) || this.posEntries()?.[0]!);
      this.features.setValue(this.mapIdsToEntries(data.features || [], this.featureEntries()));
      this.tags.setValue(this.mapIdsToEntries(data.tags || [], this.tagEntries()));
      this.note.setValue(data.note || null);
      this.formCtl.markAsPristine();
    }
  }

  public onPosEntriesChange(entries: ThesaurusEntry[]): void {
    this.pos.setValue(entries[0]);
    this.pos.markAsDirty();
    this.pos.updateValueAndValidity();
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
      pos: this.pos.value.id,
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
