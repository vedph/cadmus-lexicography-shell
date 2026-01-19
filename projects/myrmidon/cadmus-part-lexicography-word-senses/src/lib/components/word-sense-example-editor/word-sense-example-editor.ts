import {
  Component,
  Inject,
  OnDestroy,
  Optional,
  effect,
  input,
  model,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { NgeMarkdownModule } from '@cisstech/nge/markdown';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';
import {
  CadmusTextEdService,
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CadmusTextEdBindings,
} from '@myrmidon/cadmus-text-ed';

import { WordSenseExample } from '../../lex-word-senses-part';

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
    NgeMonacoModule,
    NgeMarkdownModule,
    ThesaurusEntriesPickerComponent,
  ],
  templateUrl: './word-sense-example-editor.html',
  styleUrl: './word-sense-example-editor.css',
})
export class WordSenseExampleEditor implements OnDestroy {
  // Monaco
  private readonly _disposables: monaco.IDisposable[] = [];
  private _textModel?: monaco.editor.ITextModel;
  private _textEditor?: monaco.editor.IStandaloneCodeEditor;
  private _explanationModel?: monaco.editor.ITextModel;
  private _explanationEditor?: monaco.editor.IStandaloneCodeEditor;

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
    private _editorBindings?: CadmusTextEdBindings
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
  }

  public ngOnDestroy() {
    this._disposables.forEach((d) => d.dispose());
  }

  private async applyEdit(selector: string, editor: monaco.editor.IStandaloneCodeEditor) {
    if (!editor) {
      return;
    }
    const selection = editor.getSelection();
    const text = selection ? editor.getModel()!.getValueInRange(selection) : '';

    const result = await this._editService.edit({
      selector,
      text: text,
    });

    editor.executeEdits('my-source', [
      {
        range: selection!,
        text: result.text,
        forceMoveMarkers: true,
      },
    ]);
  }

  public onCreateTextEditor(editor: monaco.editor.IEditor) {
    editor.updateOptions({
      minimap: {
        side: 'right',
      },
      wordWrap: 'on',
      automaticLayout: true,
    });
    this._textModel =
      this._textModel || monaco.editor.createModel(this.text?.value || '', 'markdown');
    editor.setModel(this._textModel);
    this._textEditor = editor as monaco.editor.IStandaloneCodeEditor;

    this._disposables.push(
      this._textModel.onDidChangeContent((e) => {
        this.text.setValue(this._textModel!.getValue());
        this.text.markAsDirty();
        this.text.updateValueAndValidity();
      })
    );

    // plugins
    if (this._editorBindings) {
      Object.keys(this._editorBindings).forEach((key) => {
        const n = parseInt(key, 10);
        console.log('Binding ' + n + ' to ' + this._editorBindings![key as any]);
        this._textEditor!.addCommand(n, () => {
          this.applyEdit(this._editorBindings![key as any], this._textEditor!);
        });
      });
    }
  }

  public onCreateExplanationEditor(editor: monaco.editor.IEditor) {
    editor.updateOptions({
      minimap: {
        enabled: false,
      },
      wordWrap: 'on',
      automaticLayout: true,
    });
    this._explanationModel =
      this._explanationModel ||
      monaco.editor.createModel(this.explanation?.value || '', 'markdown');
    editor.setModel(this._explanationModel);
    this._explanationEditor = editor as monaco.editor.IStandaloneCodeEditor;

    this._disposables.push(
      this._explanationModel.onDidChangeContent((e) => {
        this.explanation.setValue(this._explanationModel!.getValue());
        this.explanation.markAsDirty();
        this.explanation.updateValueAndValidity();
      })
    );

    // plugins
    if (this._editorBindings) {
      Object.keys(this._editorBindings).forEach((key) => {
        const n = parseInt(key, 10);
        console.log('Binding ' + n + ' to ' + this._editorBindings![key as any]);
        this._explanationEditor!.addCommand(n, () => {
          this.applyEdit(this._editorBindings![key as any], this._explanationEditor!);
        });
      });
    }
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

  private updateForm(example: WordSenseExample | undefined | null): void {
    if (!example) {
      this.form.reset();
    } else {
      this.tags.setValue(this.mapIdToEntries(example.tags || [], this.tagEntries()));
      this.citation.setValue(example.citation || null);
      this._textModel?.setValue(example.text || '');
      this._explanationModel?.setValue(example.explanation || '');
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
