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
import { debounceTime } from 'rxjs';

@Component({
  selector: 'cadmus-word-sense-editor',
  imports: [
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
  // Monaco
  private _editor?: StandaloneCodeEditor;
  public readonly editorOptions: StandaloneEditorConstructionOptions = {
    minimap: { side: 'right' },
    wordWrap: 'on',
    automaticLayout: true,
  };
  // preview
  public readonly previewHtml = signal<SafeHtml>('');
  private readonly _sanitizer = inject(DomSanitizer);

  public readonly sense = model<WordSense | undefined>();
  public readonly cancelEdit = output();

  public readonly editedEx = signal<WordSenseExample | undefined>(undefined);
  public readonly editedExIndex = signal<number>(-1);

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

  public eid: FormControl<string | null>;
  public tags: FormControl<ThesaurusEntry[]>;
  public definition: FormControl<string>;
  public note: FormControl<string | null>;
  public examples: FormControl<WordSenseExample[]>;
  public relatedIds: FormControl<AssertedCompositeId[]>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
    private _editService: CadmusTextEdService,
    @Inject(CADMUS_TEXT_ED_BINDINGS_TOKEN)
    @Optional()
    private _editorBindings?: CadmusTextEdBindings,
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

    this.definition.valueChanges.pipe(debounceTime(50), takeUntilDestroyed()).subscribe(() => {
      this.updatePreview();
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

    if (this._editorBindings) {
      Object.keys(this._editorBindings).forEach((key) => {
        const n = parseInt(key, 10);
        this._editor!.addCommand(n, () => {
          this.applyEdit(this._editorBindings![key as any]);
        });
      });
    }
  }

  private updatePreview(): void {
    const html = marked.parse(this.definition.value || '', { async: false }) as string;
    this.previewHtml.set(this._sanitizer.bypassSecurityTrustHtml(html));
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

  private updateForm(sense: WordSense | undefined | null): void {
    // an example being edited belongs to the previous sense
    this.closeExample();
    if (!sense) {
      this.form.reset();
    } else {
      this.eid.setValue(sense.eid || null);
      this.tags.setValue(this.mapIdToEntries(sense.tags || [], this.tagEntries()));
      this.definition.setValue(sense.definition || '');
      this.note.setValue(sense.note || null);
      this.examples.setValue(sense.examples || []);
      this.relatedIds.setValue(sense.relatedIds || []);
      this.form.markAsPristine();
    }
  }

  public onTagEntriesChange(entries: ThesaurusEntry[]): void {
    this.tags.setValue(entries);
    this.tags.markAsDirty();
    this.tags.updateValueAndValidity();
  }

  public onRelatedIdsChange(ids: AssertedCompositeId[]): void {
    this.relatedIds.setValue(ids);
    this.relatedIds.markAsDirty();
    this.relatedIds.updateValueAndValidity();
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

  public addExample(): void {
    const entry: WordSenseExample = {
      text: '',
    };
    this.editedExIndex.set(-1);
    this.editedEx.set(entry);
  }

  public editExample(entry: WordSenseExample, index: number): void {
    this.editedExIndex.set(index);
    this.editedEx.set(structuredClone(entry));
  }

  public closeExample(): void {
    this.editedExIndex.set(-1);
    this.editedEx.set(undefined);
  }

  public saveExample(entry: WordSenseExample): void {
    const entries = [...this.examples.value];
    if (this.editedExIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedExIndex(), 1, entry);
    }
    this.examples.setValue(entries);
    this.examples.markAsDirty();
    this.examples.updateValueAndValidity();
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
          const entries = [...this.examples.value];
          entries.splice(index, 1);
          this.examples.setValue(entries);
          this.examples.markAsDirty();
          this.examples.updateValueAndValidity();
        }
      });
  }

  public moveExampleUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.examples.value[index];
    const entries = [...this.examples.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.examples.setValue(entries);
    this.examples.markAsDirty();
    this.examples.updateValueAndValidity();
    this.followMovedExample(index, index - 1);
  }

  public moveExampleDown(index: number): void {
    if (index + 1 >= this.examples.value.length) {
      return;
    }
    const entry = this.examples.value[index];
    const entries = [...this.examples.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.examples.setValue(entries);
    this.examples.markAsDirty();
    this.examples.updateValueAndValidity();
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
