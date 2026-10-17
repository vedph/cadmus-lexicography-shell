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

import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';

import { WordCollocationToken } from '../../lex-word-collocations-part';

/**
 * The editable draft behind the form. POS and features are thesaurus entry
 * IDs ('' for no POS); the pickers get the corresponding entries.
 */
interface WordCollocationTokenControls {
  pos: string;
  features: string[];
  isHead: boolean;
  isOptional: boolean;
  note: string;
}

/**
 * Token -> draft. A token without POS gets the default POS.
 */
function toDraft(
  token: WordCollocationToken | undefined,
  defaultPos: string,
): WordCollocationTokenControls {
  return {
    pos: token ? token.pos || defaultPos : '',
    features: [...(token?.features || [])],
    isHead: !!token?.isHead,
    isOptional: !!token?.isOptional,
    note: token?.note || '',
  };
}

function toData(draft: WordCollocationTokenControls): WordCollocationToken {
  return {
    pos: draft.pos,
    features: [...draft.features],
    isHead: draft.isHead,
    isOptional: draft.isOptional,
    note: draft.note.trim() || undefined,
  };
}

function mapIdToEntry(id: string, entries: ThesaurusEntry[] | undefined): ThesaurusEntry {
  return entries?.find((e) => e.id === id) || { id, value: id };
}

@Component({
  selector: 'cadmus-word-colloc-token-editor',
  imports: [
    FormField,
    MatCheckbox,
    MatError,
    MatFormField,
    MatIconButton,
    MatIcon,
    MatInput,
    MatLabel,
    MatTooltip,
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

  // the POS for a token without it: a string, so that getting new POS
  // entries with the same first entry does not rebuild the draft
  private readonly _defaultPos = computed(() => this.posEntries()?.[0]?.id ?? '');

  /**
   * The editable draft, derived from the bound token. On the echo of our
   * own save the draft is kept, so that normalization does not overwrite it.
   */
  private readonly _draft = linkedSignal<
    { token: WordCollocationToken | undefined; defaultPos: string },
    WordCollocationTokenControls
  >({
    source: () => ({ token: this.token(), defaultPos: this._defaultPos() }),
    computation: (source, previous) =>
      previous && JSON.stringify(source.token) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(source.token, source.defaultPos),
  });

  public readonly form = form(this._draft, (p) => {
    required(p.pos);
    maxLength(p.note, 1000);
  });

  // the entries for the pickers
  public readonly pickedPos = computed<ThesaurusEntry[]>(() => {
    const id = this.form.pos().value();
    return id ? [mapIdToEntry(id, this.posEntries())] : [];
  });
  public readonly pickedFeatures = computed<ThesaurusEntry[]>(() =>
    this.form
      .features()
      .value()
      .map((id) => mapIdToEntry(id, this.featureEntries())),
  );

  constructor() {
    // when the draft mirrors the bound token, there are no unsaved edits
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (
          JSON.stringify(draft) === JSON.stringify(toDraft(this.token(), this._defaultPos()))
        ) {
          this.form().reset();
        }
      });
    });
  }

  public onPosEntriesChange(entries: ThesaurusEntry[]): void {
    this.form.pos().value.set(entries[0]?.id ?? '');
    this.form.pos().markAsDirty();
  }

  public onFeaturesChange(entries: ThesaurusEntry[]): void {
    this.form.features().value.set(entries.map((e) => e.id));
    this.form.features().markAsDirty();
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Save the current draft into the `token` model signal.
   * @param pristine If true (default), the form's interaction state is
   * cleared after saving.
   */
  public save(pristine = true): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }

    this.token.set(toData(this._draft()));

    if (pristine) {
      this.form().reset();
    }
  }
}
