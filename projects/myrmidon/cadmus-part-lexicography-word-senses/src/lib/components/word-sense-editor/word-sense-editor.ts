import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  untracked,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  EditorInitializedEvent,
  NgxMonacoEditorComponent,
  StandaloneCodeEditor,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';
import { marked } from 'marked';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { EllipsisPipe, FlatLookupPipe } from '@myrmidon/ngx-tools';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  copyFormValue,
  isImplicitSubmission,
  setFieldFromChild,
  setFieldFromEditor,
} from '@myrmidon/cadmus-ui';
import {
  AssertedCompositeId,
  AssertedCompositeIdsComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';
import {
  CadmusTextEdService,
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CadmusTextEdBindings,
} from '@myrmidon/cadmus-text-ed';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';

import { WordSense, WordSenseExample } from '../../lex-word-senses-part';
import { WordSenseExampleEditor } from '../word-sense-example-editor/word-sense-example-editor';

/**
 * The editable draft behind the form. Tags are thesaurus entry IDs.
 */
interface WordSenseControls {
  eid: string;
  tags: string[];
  definition: string;
  note: string;
  examples: WordSenseExample[];
  relatedIds: AssertedCompositeId[];
}

function toDraft(sense: WordSense | undefined): WordSenseControls {
  return {
    eid: sense?.eid || '',
    tags: [...(sense?.tags || [])],
    definition: sense?.definition || '',
    note: sense?.note || '',
    // copy: the form tags the objects in its arrays
    examples: copyFormValue(sense?.examples || []),
    relatedIds: copyFormValue(sense?.relatedIds || []),
  };
}

function toData(draft: WordSenseControls): WordSense {
  return {
    eid: draft.eid.trim() || undefined,
    tags: draft.tags.length ? [...draft.tags] : undefined,
    definition: draft.definition.trim(),
    note: draft.note.trim() || undefined,
    examples: draft.examples.length ? copyFormValue(draft.examples) : undefined,
    relatedIds: draft.relatedIds.length ? copyFormValue(draft.relatedIds) : undefined,
  };
}

@Component({
  selector: 'cadmus-word-sense-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    NgxMonacoEditorComponent,
    AssertedCompositeIdsComponent,
    ThesaurusEntriesPickerComponent,
    WordSenseExampleEditor,
    EllipsisPipe,
    FlatLookupPipe,
  ],
  templateUrl: './word-sense-editor.html',
  styleUrl: './word-sense-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordSenseEditor {
  private readonly _dialogService = inject(DialogService);
  private readonly _editService = inject(CadmusTextEdService);
  // the token is declared with the service options type, but it provides
  // the key bindings
  private readonly _editorBindings = inject(CADMUS_TEXT_ED_BINDINGS_TOKEN, {
    optional: true,
  }) as unknown as CadmusTextEdBindings | null;
  private readonly _sanitizer = inject(DomSanitizer);

  // Monaco
  private _editor?: StandaloneCodeEditor;
  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };

  public readonly sense = model<WordSense | undefined>();
  public readonly cancelEdit = output();

  // the example being edited, and its index (-1 for a new one): an example
  // being edited belongs to the sense, so they are reset when it changes
  public readonly editedEx = linkedSignal<WordSense | undefined, WordSenseExample | undefined>({
    source: () => this.sense(),
    computation: () => undefined,
  });
  public readonly editedExIndex = linkedSignal<WordSense | undefined, number>({
    source: () => this.sense(),
    computation: () => -1,
  });

  // lex-word-sense-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>();
  // asserted-id-scopes
  public readonly assIdScopeEntries = input<ThesaurusEntry[] | undefined>();
  // asserted-id-tags
  public readonly assIdTagEntries = input<ThesaurusEntry[] | undefined>();
  // assertion-tags
  public readonly assTagEntries = input<ThesaurusEntry[] | undefined>();
  // doc-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[] | undefined>();
  // doc-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[] | undefined>();
  // asserted-id-features
  public readonly idFeatureEntries = input<ThesaurusEntry[]>();

  public readonly lookupProviderOptions = input<LookupProviderOptions | undefined>();

  /**
   * The editable draft, derived from the bound sense. On the echo of our
   * own save the draft is kept, so that normalization does not overwrite it.
   */
  private readonly _draft = linkedSignal<WordSense | undefined, WordSenseControls>({
    source: () => this.sense(),
    computation: (sense, previous) =>
      previous && JSON.stringify(sense) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(sense),
  });

  public readonly form = form(this._draft, (p) => {
    maxLength(p.eid, 50);
    required(p.definition);
    maxLength(p.definition, 5000);
    maxLength(p.note, 1000);
  });

  public readonly setFieldFromEditor = setFieldFromEditor;

  public readonly pickedTags = computed<ThesaurusEntry[]>(() => {
    const entries = this.tagEntries();
    return this.form
      .tags()
      .value()
      .map((id) => entries?.find((e) => e.id === id) || { id, value: id });
  });

  public readonly previewHtml = computed<SafeHtml>(() =>
    this._sanitizer.bypassSecurityTrustHtml(
      marked.parse(this.form.definition().value(), { async: false }) as string,
    ),
  );

  constructor() {
    // when the draft mirrors the bound sense, there are no unsaved edits
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (JSON.stringify(draft) === JSON.stringify(toDraft(this.sense()))) {
          this.form().reset();
        }
      });
    });
  }

  private async applyEdit(selector: string) {
    if (!this._editor) {
      return;
    }
    const selection = this._editor.getSelection();
    const text = selection ? this._editor.getModel()!.getValueInRange(selection) : '';

    const result = await this._editService.edit({ selector, text });

    this._editor.executeEdits('my-source', [
      {
        range: selection!,
        text: result.text,
        forceMoveMarkers: true,
      },
    ]);
  }

  public onEditorInit(event: EditorInitializedEvent) {
    this._editor = event.editor;
    this._editor.focus();

    const bindings = this._editorBindings;
    if (bindings) {
      Object.keys(bindings).forEach((key) => {
        const n = parseInt(key, 10);
        this._editor!.addCommand(n, () => {
          this.applyEdit(bindings[n]);
        });
      });
    }
  }

  public onTagEntriesChange(entries: ThesaurusEntry[]): void {
    this.form.tags().value.set(entries.map((e) => e.id));
    this.form.tags().markAsDirty();
  }

  // a child editor's output: it may emit a copy of the IDs it received
  public onRelatedIdsChange(ids: AssertedCompositeId[]): void {
    setFieldFromChild(this.form.relatedIds, copyFormValue(ids || []));
  }

  public addExample(): void {
    this.editedExIndex.set(-1);
    this.editedEx.set({ text: '' });
  }

  public editExample(entry: WordSenseExample, index: number): void {
    this.editedExIndex.set(index);
    // structuredClone also drops the form's Symbol tag
    this.editedEx.set(structuredClone(entry));
  }

  public closeExample(): void {
    this.editedExIndex.set(-1);
    this.editedEx.set(undefined);
  }

  // these are user actions: they set the list and mark it as dirty
  private setExamples(examples: WordSenseExample[]): void {
    this.form.examples().value.set(examples);
    this.form.examples().markAsDirty();
  }

  public saveExample(entry: WordSenseExample): void {
    const entries = [...this.form.examples().value()];
    if (this.editedExIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedExIndex(), 1, entry);
    }
    this.setExamples(entries);
    this.closeExample();
  }

  public deleteExample(index: number): void {
    this._dialogService
      .confirm('Confirmation', `Delete example #${index + 1}?`)
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          // keep the edited example index in sync with the list
          const edited = this.editedExIndex();
          if (edited === index) {
            this.closeExample();
          } else if (edited > index) {
            this.editedExIndex.set(edited - 1);
          }
          const entries = [...this.form.examples().value()];
          entries.splice(index, 1);
          this.setExamples(entries);
        }
      });
  }

  public moveExampleUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entries = [...this.form.examples().value()];
    const entry = entries[index];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.setExamples(entries);
    this.followMovedExample(index, index - 1);
  }

  public moveExampleDown(index: number): void {
    const entries = [...this.form.examples().value()];
    if (index + 1 >= entries.length) {
      return;
    }
    const entry = entries[index];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.setExamples(entries);
    this.followMovedExample(index, index + 1);
  }

  /**
   * Keep the edited example index in sync with the list after the example
   * at index from has been swapped with the one at index to.
   */
  private followMovedExample(from: number, to: number): void {
    if (this.editedExIndex() === from) {
      this.editedExIndex.set(to);
    } else if (this.editedExIndex() === to) {
      this.editedExIndex.set(from);
    }
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Handle Enter in a text input, like the submission of a form: save when
   * changed, or show the errors when invalid. The event is consumed in any
   * case, so that it does not reach an enclosing editor. An Enter in the
   * nested example editor is consumed by that editor.
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
   * Save the current draft into the `sense` model signal.
   * @param pristine If true (default), the form's interaction state is
   * cleared after saving.
   */
  public save(pristine = true): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }

    this.sense.set(toData(this._draft()));

    if (pristine) {
      this.form().reset();
    }
  }
}
