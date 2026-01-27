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
import { MonacoEditorHelper } from '@myrmidon/cadmus-part-general-ui';

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
  private _textHelper!: MonacoEditorHelper;
  private _explanationHelper!: MonacoEditorHelper;

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

    // init Monaco helpers
    this._textHelper = new MonacoEditorHelper(this.text);
    this._explanationHelper = new MonacoEditorHelper(this.explanation);

    // when model changes, update form
    effect(() => {
      const data = this.example();
      this.updateForm(data);
    });
  }

  public ngOnDestroy() {
    this._textHelper.dispose();
    this._explanationHelper.dispose();
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
    this._textHelper.initEditor(editor);

    // plugins
    if (this._editorBindings) {
      this._textHelper.addBindings(
        this._editorBindings as Record<string, string>,
        this.applyEdit.bind(this),
      );
    }
  }

  public onCreateExplanationEditor(editor: monaco.editor.IEditor) {
    this._explanationHelper.initEditor(editor, { minimap: { enabled: false } });

    // plugins
    if (this._editorBindings) {
      this._explanationHelper.addBindings(
        this._editorBindings as Record<string, string>,
        this.applyEdit.bind(this),
      );
    }
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

  private updateForm(example: WordSenseExample | undefined | null): void {
    if (!example) {
      this.form.reset();
      this._textHelper.setValue('');
      this._explanationHelper.setValue('');
    } else {
      this.tags.setValue(this.mapIdToEntries(example.tags || [], this.tagEntries()));
      this.citation.setValue(example.citation || null);
      this._textHelper.setValue(example.text || '');
      this._explanationHelper.setValue(example.explanation || '');
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
