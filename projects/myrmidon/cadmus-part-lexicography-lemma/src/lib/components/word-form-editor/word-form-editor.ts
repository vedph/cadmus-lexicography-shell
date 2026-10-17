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

import { WordForm } from '../../lex-lemma-part';

/**
 * The editable draft behind the form. POS, features and tags are thesaurus
 * entry IDs ('' for no POS); the pickers get the corresponding entries.
 */
interface WordFormControls {
  type: string;
  prefix: string;
  value: string;
  suffix: string;
  pos: string;
  features: string[];
  tags: string[];
  note: string;
}

/**
 * Word form -> draft. A word form without POS gets the default POS.
 */
function toDraft(data: WordForm | undefined, defaultPos: string): WordFormControls {
  return {
    type: data?.type || '',
    prefix: data?.prefix || '',
    value: data?.value || '',
    suffix: data?.suffix || '',
    pos: data ? data.pos || defaultPos : '',
    features: [...(data?.features || [])],
    tags: [...(data?.tags || [])],
    note: data?.note || '',
  };
}

/**
 * Draft -> word form.
 */
function toData(draft: WordFormControls): WordForm {
  return {
    type: draft.type.trim(),
    prefix: draft.prefix.trim() || undefined,
    value: draft.value.trim(),
    suffix: draft.suffix.trim() || undefined,
    pos: draft.pos,
    features: [...draft.features],
    tags: [...draft.tags],
    note: draft.note.trim() || undefined,
  };
}

function mapIdToEntry(id: string, entries: ThesaurusEntry[] | undefined): ThesaurusEntry {
  return entries?.find((e) => e.id === id) || { id, value: id };
}

@Component({
  selector: 'cadmus-word-form-editor',
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
  templateUrl: './word-form-editor.html',
  styleUrl: './word-form-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  // the POS for a word form without it: a string, so that getting new
  // POS entries with the same first entry does not rebuild the draft
  private readonly _defaultPos = computed(() => this.posEntries()?.[0]?.id ?? '');

  /**
   * The editable draft, derived from the bound word form. On the echo of
   * our own save (the bound form equals what the draft maps to) the draft
   * is kept, so that normalization does not overwrite it.
   */
  private readonly _draft = linkedSignal<
    { data: WordForm | undefined; defaultPos: string },
    WordFormControls
  >({
    source: () => ({ data: this.form(), defaultPos: this._defaultPos() }),
    computation: (source, previous) =>
      previous && JSON.stringify(source.data) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(source.data, source.defaultPos),
  });

  public readonly editForm = form(this._draft, (p) => {
    required(p.type);
    maxLength(p.type, 50);
    maxLength(p.prefix, 50);
    required(p.value);
    maxLength(p.value, 500);
    maxLength(p.suffix, 50);
    required(p.pos);
  });

  // the entries for the pickers
  public readonly pickedPos = computed<ThesaurusEntry[]>(() => {
    const id = this.editForm.pos().value();
    return id ? [mapIdToEntry(id, this.posEntries())] : [];
  });
  public readonly pickedFeatures = computed<ThesaurusEntry[]>(() =>
    this.editForm
      .features()
      .value()
      .map((id) => mapIdToEntry(id, this.featureEntries())),
  );
  public readonly pickedTags = computed<ThesaurusEntry[]>(() =>
    this.editForm
      .tags()
      .value()
      .map((id) => mapIdToEntry(id, this.tagEntries())),
  );

  constructor() {
    // when the draft mirrors the bound form, there are no unsaved edits
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (this.isDraftInSync(draft)) {
          this.editForm().reset();
        }
      });
    });
  }

  private isDraftInSync(draft: WordFormControls): boolean {
    return (
      JSON.stringify(draft) === JSON.stringify(toDraft(this.form(), this._defaultPos()))
    );
  }

  public onPosEntriesChange(entries: ThesaurusEntry[]): void {
    this.editForm.pos().value.set(entries[0]?.id ?? '');
    this.editForm.pos().markAsDirty();
  }

  public onFeatureEntriesChange(entries: ThesaurusEntry[]): void {
    this.editForm.features().value.set(entries.map((e) => e.id));
    this.editForm.features().markAsDirty();
  }

  public onTagEntriesChange(entries: ThesaurusEntry[]): void {
    this.editForm.tags().value.set(entries.map((e) => e.id));
    this.editForm.tags().markAsDirty();
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Handle Enter in a text input, like the submission of a form: save when
   * changed, or show the errors when invalid. The event is consumed in any
   * case, so that it does not reach an enclosing editor.
   * @param event The keydown event.
   */
  public onEnterKey(event: Event): void {
    if (!isImplicitSubmission(event)) {
      return;
    }
    event.preventDefault();
    if (this.editForm().dirty()) {
      this.save();
    }
  }

  /**
   * Save the current draft into the `form` model signal.
   * @param pristine If true (default), the form's interaction state is
   * cleared after saving.
   */
  public save(pristine = true): void {
    if (this.editForm().invalid()) {
      // show validation errors
      this.editForm().markAsTouched();
      return;
    }

    this.form.set(toData(this._draft()));

    if (pristine) {
      this.editForm().reset();
    }
  }
}
