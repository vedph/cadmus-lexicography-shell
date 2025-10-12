import { CommonModule } from '@angular/common';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { NgeMarkdownModule } from '@cisstech/nge/markdown';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { AssertedCompositeId } from '@myrmidon/cadmus-refs-asserted-ids';
import { ThesEntriesPickerComponent } from '@myrmidon/cadmus-ui';
import {
  CadmusTextEdService,
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CadmusTextEdBindings,
} from '@myrmidon/cadmus-text-ed';

import { WordSense, WordSenseExample } from '../../lex-word-senses-part';

@Component({
  selector: 'cadmus-word-sense-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    NgeMonacoModule,
    NgeMarkdownModule,
    ThesEntriesPickerComponent,
  ],
  templateUrl: './word-sense-editor.html',
  styleUrl: './word-sense-editor.css',
})
export class WordSenseEditor {
  // Monaco
  private readonly _disposables: monaco.IDisposable[] = [];
  private _definitionModel?: monaco.editor.ITextModel;
  private _definitionEditor?: monaco.editor.IStandaloneCodeEditor;

  public readonly sense = model<WordSense | undefined>();
  public readonly cancelEdit = output();

  // lex-word-sense-tags
  public readonly tagEntries = input<ThesaurusEntry[] | undefined>();

  public eid: FormControl<string | null>;
  public tags: FormControl<ThesaurusEntry[]>;
  public definition: FormControl<string>;
  public note: FormControl<string | null>;
  public examples: FormControl<WordSenseExample[]>;
  public relatedIds: FormControl<AssertedCompositeId[]>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _editService: CadmusTextEdService,
    @Inject(CADMUS_TEXT_ED_BINDINGS_TOKEN)
    @Optional()
    private _editorBindings?: CadmusTextEdBindings
  ) {
    // form
    this.eid = formBuilder.control(null, {
      validators: Validators.maxLength(50),
    });
    this.tags = formBuilder.control([], {
      nonNullable: true,
    });
    this.definition = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(5000)],
    });
    this.note = formBuilder.control(null, {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    });
    this.examples = formBuilder.control([], {
      nonNullable: true,
    });
    this.relatedIds = formBuilder.control([], {
      nonNullable: true,
    });
    this.form = formBuilder.group({
      eid: this.eid,
      tags: this.tags,
      definition: this.definition,
      note: this.note,
      examples: this.examples,
      relatedIds: this.relatedIds,
    });

    // when model changes, update form
    effect(() => {
      const data = this.sense();
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
    this._definitionModel =
      this._definitionModel || monaco.editor.createModel(this.definition?.value || '', 'markdown');
    editor.setModel(this._definitionModel);
    this._definitionEditor = editor as monaco.editor.IStandaloneCodeEditor;

    this._disposables.push(
      this._definitionModel.onDidChangeContent((e) => {
        this.definition.setValue(this._definitionModel!.getValue());
        this.definition.markAsDirty();
        this.definition.updateValueAndValidity();
      })
    );

    // plugins
    if (this._editorBindings) {
      Object.keys(this._editorBindings).forEach((key) => {
        const n = parseInt(key, 10);
        console.log('Binding ' + n + ' to ' + this._editorBindings![key as any]);
        this._definitionEditor!.addCommand(n, () => {
          this.applyEdit(this._editorBindings![key as any], this._definitionEditor!);
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

  private updateForm(sense: WordSense | undefined | null): void {
    if (!sense) {
      this.form.reset();
    } else {
      this.eid.setValue(sense.eid || null);
      this.tags.setValue(this.mapIdToEntries(sense.tags || [], this.tagEntries()));
      this._definitionModel?.setValue(sense.definition || '');
      this.note.setValue(sense.note || null);
      this.examples.setValue(sense.examples || []);
      this.relatedIds.setValue(sense.relatedIds || []);
      this.form.markAsPristine();
    }
  }

  private getSense(): WordSense {
    return {
      eid: this.eid.value || undefined,
      tags: this.tags.value?.length ? this.tags.value.map((e) => e.id) : undefined,
      definition: this.definition.value?.trim() || '',
      note: this.note.value?.trim() || undefined,
      examples: this.examples.value?.length ? this.examples.value : undefined,
      relatedIds: this.relatedIds.value?.length ? this.relatedIds.value : undefined,
    };
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  /**
   * Saves the current form data by updating the `sense` model signal.
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

    const sense = this.getSense();
    this.sense.set(sense);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
