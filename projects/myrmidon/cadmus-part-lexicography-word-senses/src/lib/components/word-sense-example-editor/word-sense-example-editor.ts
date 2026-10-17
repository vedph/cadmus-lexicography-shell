import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Optional,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';
import {
  CadmusTextEdService,
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CadmusTextEdBindings,
} from '@myrmidon/cadmus-text-ed';
import { WordSenseExample } from '../../lex-word-senses-part';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'cadmus-word-sense-example-editor',
  imports: [
    ReactiveFormsModule,
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
  // Monaco
  private _textEditor?: StandaloneCodeEditor;
  private _explanationEditor?: StandaloneCodeEditor;
  private readonly _sanitizer = inject(DomSanitizer);
  public readonly textPreviewHtml = signal<SafeHtml>('');
  public readonly explanationPreviewHtml = signal<SafeHtml>('');

  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };

  public readonly example = model<WordSenseExample | undefined>();
  public readonly cancelEdit = output();

  // lex-word-sense-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>();

  public tags: FormControl<ThesaurusEntry[]>;
  public citation: FormControl<string | null>;
  public text: FormControl<string>;
  public explanation: FormControl<string | null>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _editService: CadmusTextEdService,
    @Inject(CADMUS_TEXT_ED_BINDINGS_TOKEN)
    @Optional()
    private _editorBindings?: CadmusTextEdBindings,
  ) {
    // form
    this.tags = formBuilder.control([], { nonNullable: true });
    this.citation = formBuilder.control(null, {
      nonNullable: true,
      validators: Validators.maxLength(500),
    });
    this.text = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1000)],
    });
    this.explanation = formBuilder.control(null, {
      nonNullable: true,
      validators: Validators.maxLength(1000),
    });
    this.note = formBuilder.control(null, {
      nonNullable: true,
      validators: Validators.maxLength(1000),
    });

    this.form = formBuilder.group({
      tags: this.tags,
      citation: this.citation,
      text: this.text,
      explanation: this.explanation,
      note: this.note,
    });

    // when model changes, update form
    effect(() => {
      const data = this.example();
      this.updateForm(data);
    });

    this.text.valueChanges.pipe(debounceTime(50), takeUntilDestroyed()).subscribe(() => {
      this.updateTextPreview();
    });
    this.explanation.valueChanges.pipe(debounceTime(50), takeUntilDestroyed()).subscribe(() => {
      this.updateExplanationPreview();
    });
  }

  private async applyTextEdit(selector: string) {
    if (!this._textEditor) {
      return;
    }
    const selection = this._textEditor.getSelection();
    const text = selection ? this._textEditor.getModel()!.getValueInRange(selection) : '';

    const result = await this._editService.edit({ selector, text });

    this._textEditor.executeEdits('my-source', [
      {
        range: selection!,
        text: result.text,
        forceMoveMarkers: true,
      },
    ]);
  }

  public onTextEditorInit(event: EditorInitializedEvent) {
    this._textEditor = event.editor;
    this._textEditor.focus();

    if (this._editorBindings) {
      Object.keys(this._editorBindings).forEach((key) => {
        const n = parseInt(key, 10);
        this._textEditor!.addCommand(n, () => {
          this.applyTextEdit(this._editorBindings![key as any]);
        });
      });
    }
  }

  private async applyExplanationEdit(selector: string) {
    if (!this._explanationEditor) {
      return;
    }
    const selection = this._explanationEditor.getSelection();
    const text = selection ? this._explanationEditor.getModel()!.getValueInRange(selection) : '';

    const result = await this._editService.edit({ selector, text });

    this._explanationEditor.executeEdits('my-source', [
      {
        range: selection!,
        text: result.text,
        forceMoveMarkers: true,
      },
    ]);
  }

  public onExplanationEditorInit(event: EditorInitializedEvent) {
    this._explanationEditor = event.editor;
    this._explanationEditor.focus();

    if (this._editorBindings) {
      Object.keys(this._editorBindings).forEach((key) => {
        const n = parseInt(key, 10);
        this._explanationEditor!.addCommand(n, () => {
          this.applyExplanationEdit(this._editorBindings![key as any]);
        });
      });
    }
  }

  private updateTextPreview(): void {
    const html = marked.parse(this.text.value || '', { async: false }) as string;
    this.textPreviewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
  }

  private updateExplanationPreview(): void {
    const html = marked.parse(this.explanation.value || '', { async: false }) as string;
    this.explanationPreviewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
  }

  public mapIdToEntry(
    id: string | null,
    entries: ThesaurusEntry[] | undefined,
  ): ThesaurusEntry | null {
    if (!id) return null;
    if (!entries) return { id, value: id };
    return entries.find((e) => e.id === id) || { id, value: id };
  }

  private mapIdToEntries(ids: string[], entries: ThesaurusEntry[] | undefined): ThesaurusEntry[] {
    if (!entries) return ids.map((id) => ({ id, value: id }));
    return ids.map((id) => entries.find((e) => e.id === id) || { id, value: id });
  }

  public onTagEntriesChange(entries: ThesaurusEntry[]): void {
    this.tags.setValue(entries);
    this.tags.markAsDirty();
    this.tags.updateValueAndValidity();
  }

  private updateForm(example: WordSenseExample | undefined | null): void {
    if (!example) {
      this.form.reset();
    } else {
      this.tags.setValue(this.mapIdToEntries(example.tags || [], this.tagEntries()));
      this.citation.setValue(example.citation || null);
      this.text.setValue(example.text || '');
      this.explanation.setValue(example.explanation || '');
      this.note.setValue(example.note || null);
      this.form.markAsPristine();
    }
  }

  private getExample(): WordSenseExample {
    return {
      tags: this.tags.value?.length ? this.tags.value.map((e) => e.id) : undefined,
      citation: this.citation.value?.trim() || undefined,
      text: this.text.value?.trim() || '',
      explanation: this.explanation.value?.trim() || undefined,
      note: this.note.value?.trim() || undefined,
    };
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Saves the current form data by updating the example model signal.
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

    const example = this.getExample();
    this.example.set(example);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
