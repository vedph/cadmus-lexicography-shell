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
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  EditorInitializedEvent,
  NgxMonacoEditorComponent,
  StandaloneCodeEditor,
  StandaloneEditorConstructionOptions,
} from '@jean-merelis/ngx-monaco-editor';
import { marked } from 'marked';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { isImplicitSubmission, setFieldFromEditor } from '@myrmidon/cadmus-ui';
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';
import {
  CadmusTextEdService,
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CadmusTextEdBindings,
} from '@myrmidon/cadmus-text-ed';
import { WordSenseExample } from '../../lex-word-senses-part';

/**
 * The editable draft behind the form. Tags are thesaurus entry IDs.
 */
interface WordSenseExampleControls {
  tags: string[];
  citation: string;
  text: string;
  explanation: string;
  note: string;
}

function toDraft(example: WordSenseExample | undefined): WordSenseExampleControls {
  return {
    tags: [...(example?.tags || [])],
    citation: example?.citation || '',
    text: example?.text || '',
    explanation: example?.explanation || '',
    note: example?.note || '',
  };
}

function toData(draft: WordSenseExampleControls): WordSenseExample {
  return {
    tags: draft.tags.length ? [...draft.tags] : undefined,
    citation: draft.citation.trim() || undefined,
    text: draft.text.trim(),
    explanation: draft.explanation.trim() || undefined,
    note: draft.note.trim() || undefined,
  };
}

function renderMarkdown(text: string): string {
  return marked.parse(text, { async: false }) as string;
}

@Component({
  selector: 'cadmus-word-sense-example-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    NgxMonacoEditorComponent,
    ThesaurusEntriesPickerComponent,
  ],
  templateUrl: './word-sense-example-editor.html',
  styleUrl: './word-sense-example-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordSenseExampleEditor {
  private readonly _editService = inject(CadmusTextEdService);
  // @myrmidon/cadmus-text-ed 11.0.3 declares the token with the service
  // options type, while it provides the key bindings (fixed upstream, to be
  // published): the cast can be removed after updating to the fixed version
  private readonly _editorBindings = inject(CADMUS_TEXT_ED_BINDINGS_TOKEN, {
    optional: true,
  }) as unknown as CadmusTextEdBindings | null;
  private readonly _sanitizer = inject(DomSanitizer);

  // Monaco
  private _textEditor?: StandaloneCodeEditor;
  private _explanationEditor?: StandaloneCodeEditor;

  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };

  public readonly example = model<WordSenseExample | undefined>();
  public readonly cancelEdit = output();

  // lex-word-sense-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>();

  /**
   * The editable draft, derived from the bound example. On the echo of our
   * own save the draft is kept, so that normalization does not overwrite it.
   */
  private readonly _draft = linkedSignal<WordSenseExample | undefined, WordSenseExampleControls>({
    source: () => this.example(),
    computation: (example, previous) =>
      previous && JSON.stringify(example) === JSON.stringify(toData(previous.value))
        ? previous.value
        : toDraft(example),
  });

  public readonly form = form(this._draft, (p) => {
    maxLength(p.citation, 500);
    required(p.text);
    maxLength(p.text, 1000);
    maxLength(p.explanation, 1000);
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

  public readonly textPreviewHtml = computed<SafeHtml>(() =>
    this._sanitizer.bypassSecurityTrustHtml(renderMarkdown(this.form.text().value())),
  );
  public readonly explanationPreviewHtml = computed<SafeHtml>(() =>
    this._sanitizer.bypassSecurityTrustHtml(renderMarkdown(this.form.explanation().value())),
  );

  constructor() {
    // when the draft mirrors the bound example, there are no unsaved edits
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (JSON.stringify(draft) === JSON.stringify(toDraft(this.example()))) {
          this.form().reset();
        }
      });
    });
  }

  private async applyEdit(editor: StandaloneCodeEditor, selector: string) {
    const selection = editor.getSelection();
    const text = selection ? editor.getModel()!.getValueInRange(selection) : '';

    const result = await this._editService.edit({ selector, text });

    editor.executeEdits('my-source', [
      {
        range: selection!,
        text: result.text,
        forceMoveMarkers: true,
      },
    ]);
  }

  private bindEditor(editor: StandaloneCodeEditor): void {
    editor.focus();
    const bindings = this._editorBindings;
    if (bindings) {
      Object.keys(bindings).forEach((key) => {
        const n = parseInt(key, 10);
        editor.addCommand(n, () => {
          this.applyEdit(editor, bindings[n]);
        });
      });
    }
  }

  public onTextEditorInit(event: EditorInitializedEvent) {
    this._textEditor = event.editor;
    this.bindEditor(this._textEditor);
  }

  public onExplanationEditorInit(event: EditorInitializedEvent) {
    this._explanationEditor = event.editor;
    this.bindEditor(this._explanationEditor);
  }

  public onTagEntriesChange(entries: ThesaurusEntry[]): void {
    this.form.tags().value.set(entries.map((e) => e.id));
    this.form.tags().markAsDirty();
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Handle Enter in a text input, like the submission of a form: save when
   * changed, or show the errors when invalid. The event is consumed in any
   * case, so that it does not reach the enclosing sense editor.
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
   * Save the current draft into the example model signal.
   * @param pristine If true (default), the form's interaction state is
   * cleared after saving.
   */
  public save(pristine = true): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }

    this.example.set(toData(this._draft()));

    if (pristine) {
      this.form().reset();
    }
  }
}
