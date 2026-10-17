import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';

import { TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EllipsisPipe, FlatLookupPipe, NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  copyFormValue,
} from '@myrmidon/cadmus-ui';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';

import {
  LEX_WORD_SENSES_PART_TYPEID,
  LexWordSensesPart,
  WordSense,
} from '../../lex-word-senses-part';
import { WordSenseEditor } from '../word-sense-editor/word-sense-editor';

interface LexWordSensesPartSettings {
  lookupProviderOptions?: LookupProviderOptions;
}

/**
 * The editable draft behind the form.
 */
interface LexWordSensesPartControls {
  entries: WordSense[];
}

function toDraft(part?: LexWordSensesPart | null): LexWordSensesPartControls {
  // copy: the form tags the objects in its arrays
  return { entries: copyFormValue(part?.senses || []) };
}

/**
 * Word senses part editor component.
 * Thesauri: lex-word-sense-tags, asserted-id-scopes, asserted-id-tags,
 * assertion-tags, doc-reference-types, doc-reference-tags, asserted-id-features.
 */
@Component({
  selector: 'cadmus-lex-word-senses-part-editor',
  imports: [
    TitleCasePipe,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    // cadmus
    CloseSaveButtonsComponent,
    WordSenseEditor,
    FlatLookupPipe,
    EllipsisPipe,
  ],
  templateUrl: './lex-word-senses-part-editor.html',
  styleUrl: './lex-word-senses-part-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexWordSensesPartEditor extends ModelEditorComponentBase<LexWordSensesPart> {
  private readonly _dialogService = inject(DialogService);

  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<WordSense | undefined>(undefined);

  // lex-word-sense-tags
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['lex-word-sense-tags']?.entries,
  );
  // asserted-id-scopes
  public readonly assIdScopeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['asserted-id-scopes']?.entries,
  );
  // asserted-id-tags
  public readonly assIdTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['asserted-id-tags']?.entries,
  );
  // assertion-tags
  public readonly assTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['assertion-tags']?.entries,
  );
  // doc-reference-types
  public readonly refTypeEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-types']?.entries,
  );
  // doc-reference-tags
  public readonly refTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['doc-reference-tags']?.entries,
  );
  // asserted-id-features
  public readonly idFeatureEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['asserted-id-features']?.entries,
  );

  // lookup options depending on role
  public readonly lookupProviderOptions = signal<LookupProviderOptions | undefined>(undefined);

  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    // at least 1 entry
    NgxToolsSignalValidators.strictMinLength(p.entries, 1);
  });

  constructor() {
    super();
    this.initSettings<LexWordSensesPartSettings>(LEX_WORD_SENSES_PART_TYPEID, (settings) =>
      this.lookupProviderOptions.set(settings?.lookupProviderOptions || undefined),
    );
  }

  protected getValue(): LexWordSensesPart {
    const part = this.getEditedPart(LEX_WORD_SENSES_PART_TYPEID) as LexWordSensesPart;
    part.senses = copyFormValue(this._draft().entries);
    return part;
  }

  public addSense(): void {
    const entry: WordSense = {
      definition: '',
    };
    this.editSense(entry, -1);
  }

  public editSense(entry: WordSense, index: number): void {
    this.editedIndex.set(index);
    // structuredClone also drops the form's Symbol tag
    this.edited.set(structuredClone(entry));
  }

  public closeSense(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  // these are user actions: they set the list and mark it as dirty
  private setEntries(entries: WordSense[]): void {
    this.form.entries().value.set(entries);
    this.form.entries().markAsDirty();
  }

  public saveSense(entry: WordSense): void {
    const entries = [...this.form.entries().value()];
    if (this.editedIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedIndex(), 1, entry);
    }
    this.setEntries(entries);
    this.closeSense();
  }

  public deleteSense(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete sense?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          // keep the edited sense index in sync with the list
          const edited = this.editedIndex();
          if (edited === index) {
            this.closeSense();
          } else if (edited > index) {
            this.editedIndex.set(edited - 1);
          }
          const entries = [...this.form.entries().value()];
          entries.splice(index, 1);
          this.setEntries(entries);
        }
      });
  }

  public moveSenseUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entries = [...this.form.entries().value()];
    const entry = entries[index];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.setEntries(entries);
    this.followMovedSense(index, index - 1);
  }

  public moveSenseDown(index: number): void {
    const entries = [...this.form.entries().value()];
    if (index + 1 >= entries.length) {
      return;
    }
    const entry = entries[index];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.setEntries(entries);
    this.followMovedSense(index, index + 1);
  }

  /**
   * Keep the edited sense index in sync with the list after the sense
   * at index from has been swapped with the one at index to.
   */
  private followMovedSense(from: number, to: number): void {
    if (this.editedIndex() === from) {
      this.editedIndex.set(to);
    } else if (this.editedIndex() === to) {
      this.editedIndex.set(from);
    }
  }
}
