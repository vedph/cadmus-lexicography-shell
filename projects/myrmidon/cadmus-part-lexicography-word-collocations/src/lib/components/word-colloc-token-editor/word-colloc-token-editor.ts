import { ChangeDetectionStrategy, Component, effect, input, model, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';

import { WordCollocationToken } from '../../lex-word-collocations-part';

@Component({
  selector: 'cadmus-word-colloc-token-editor',
  imports: [
    ReactiveFormsModule,
    MatCheckbox,
    MatError,
    MatFormField,
    MatIconButton,
    MatIcon,
    MatInput,
    MatLabel,
    ThesaurusEntriesPickerComponent,
  ],
  templateUrl: './word-colloc-token-editor.html',
  styleUrl: './word-colloc-token-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordCollocTokenEditor {
  public readonly token = model<WordCollocationToken | undefined>();
  public readonly cancelEdit = output();

  // lex-word-ctoken-pos-tags (required)
  public readonly posEntries = input.required<ThesaurusEntry[] | undefined>();
  // lex-word-ctoken-features
  public readonly featureEntries = input<ThesaurusEntry[] | undefined>();
  // lex-word-cliteral-tags
  public readonly literalTagEntries = input<ThesaurusEntry[] | undefined>();

  public pos: FormControl<ThesaurusEntry>;
  public features: FormControl<ThesaurusEntry[]>;
  public isHead: FormControl<boolean>;
  public isOptional: FormControl<boolean>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.pos = formBuilder.control(
      { id: '', value: '' },
      {
        nonNullable: true,
        validators: Validators.required,
      }
    );
    this.features = formBuilder.control([], {
      nonNullable: true,
    });
    this.isHead = formBuilder.control(false, { nonNullable: true });
    this.isOptional = formBuilder.control(false, { nonNullable: true });
    this.note = formBuilder.control(null, { validators: Validators.maxLength(1000) });
    this.form = formBuilder.group({
      pos: this.pos,
      features: this.features,
      isHead: this.isHead,
      isOptional: this.isOptional,
      note: this.note,
    });

    // when model changes, update form
    effect(() => {
      const data = this.token();
      this.updateForm(data);
    });
  }

  private mapIdToEntry(
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

  private updateForm(data: WordCollocationToken | undefined | null): void {
    if (!data) {
      this.form.reset();
    } else {
      this.pos.setValue(this.mapIdToEntry(data.pos, this.posEntries()) || this.posEntries()?.[0]!);
      this.features.setValue(this.mapIdsToEntries(data.features || [], this.featureEntries()));
      this.isHead.setValue(!!data.isHead);
      this.isOptional.setValue(!!data.isOptional);
      this.note.setValue(data.note || null);
      this.form.markAsPristine();
    }
  }

  public onPosEntriesChange(entries: ThesaurusEntry[]): void {
    this.pos.setValue(entries[0]);
    this.pos.markAsDirty();
    this.pos.updateValueAndValidity();
  }

  public onFeaturesChange(entries: ThesaurusEntry[]): void {
    this.features.setValue(entries);
    this.features.markAsDirty();
    this.features.updateValueAndValidity();
  }

  private getToken(): WordCollocationToken {
    return {
      pos: this.pos.value.id,
      features: this.features.value.map((e) => e.id),
      isHead: this.isHead.value,
      isOptional: this.isOptional.value,
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

    const data = this.getToken();
    this.token.set(data);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
