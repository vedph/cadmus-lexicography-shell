import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { TitleCasePipe } from '@angular/common';

import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatError, MatFormField, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { FlatLookupPipe, NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  CloseSaveButtonsComponent,
  ModelEditorComponentBase,
  copyFormValue,
} from '@myrmidon/cadmus-ui';

import {
  LEX_WORD_COLLOCATIONS_PART_TYPEID,
  LexWordCollocationsPart,
  WordCollocation,
} from '../../lex-word-collocations-part';
import { WordCollocEditor } from '../word-colloc-editor/word-colloc-editor';
import { WordCollocationPipe } from '../../pipes/word-collocation.pipe';
import { WordCollocationParser } from '../../services/word-collocation-parser';

/**
 * The editable draft behind the form.
 */
interface LexWordCollocationsPartControls {
  entries: WordCollocation[];
}

function toDraft(part?: LexWordCollocationsPart | null): LexWordCollocationsPartControls {
  // copy: the form tags the objects in its arrays
  return { entries: copyFormValue(part?.collocations || []) };
}

/**
 * WordCollocationsPart editor component.
 * Thesauri: lex-word-ctoken-pos-tags, lex-word-ctoken-features, lex-word-cliteral-tags,
 * lex-word-collocation-tags.
 */
@Component({
  selector: 'cadmus-lex-word-collocations-part-editor',
  imports: [
    FormField,
    MatButton,
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatError,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatTooltip,
    TitleCasePipe,
    CloseSaveButtonsComponent,
    WordCollocEditor,
    WordCollocationPipe,
    FlatLookupPipe,
    MatHint,
  ],
  templateUrl: './lex-word-collocations-part-editor.html',
  styleUrl: './lex-word-collocations-part-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexWordCollocationPartEditor extends ModelEditorComponentBase<LexWordCollocationsPart> {
  private readonly _dialogService = inject(DialogService);

  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<WordCollocation | undefined>(undefined);

  // lex-word-collocation-tags
  public readonly collTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['lex-word-collocation-tags']?.entries,
  );
  // lex-word-ctoken-pos-tags
  public readonly tokPosEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['lex-word-ctoken-pos-tags']?.entries,
  );
  // lex-word-ctoken-features
  public readonly tokFeatureEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['lex-word-ctoken-features']?.entries,
  );
  // lex-word-cliteral-tags
  public readonly litTagEntries = computed<ThesaurusEntry[] | undefined>(
    () => this.data()?.thesauri?.['lex-word-cliteral-tags']?.entries,
  );

  public readonly labelToIdMap = computed<{ [key: string]: string }>(() => {
    const map: { [key: string]: string } = {};
    const posEntries = this.tokPosEntries();
    if (posEntries) {
      for (const entry of posEntries) {
        map[entry.value] = entry.id;
      }
    }
    return map;
  });

  private readonly _draft = linkedSignal(() => toDraft(this.data()?.value));
  public readonly form = this.createForm(this._draft, (p) => {
    // at least 1 entry
    NgxToolsSignalValidators.strictMinLength(p.entries, 1);
  });

  // the DSL form: not part of the edited model, so that it does not
  // affect the part's dirty and valid state
  private readonly _dsl = signal({ dslText: '' });
  public readonly dslForm = form(this._dsl, (p) => {
    required(p.dslText);
  });
  public readonly dslError = signal<string | undefined>(undefined);

  protected getValue(): LexWordCollocationsPart {
    const part = this.getEditedPart(LEX_WORD_COLLOCATIONS_PART_TYPEID) as LexWordCollocationsPart;
    part.collocations = copyFormValue(this._draft().entries);
    return part;
  }

  // these are user actions: they set the list and mark it as dirty
  private setEntries(entries: WordCollocation[]): void {
    this.form.entries().value.set(entries);
    this.form.entries().markAsDirty();
  }

  public addCollocation(): void {
    const collocation: WordCollocation = {
      tokens: [],
    };
    this.editCollocation(collocation, -1);
  }

  public editCollocation(collocation: WordCollocation, index: number): void {
    this.editedIndex.set(index);
    // structuredClone also drops the form's Symbol tag
    this.edited.set(structuredClone(collocation));
  }

  public closeCollocation(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveCollocation(collocation: WordCollocation): void {
    const collocations = [...this.form.entries().value()];
    if (this.editedIndex() === -1) {
      collocations.push(collocation);
    } else {
      collocations.splice(this.editedIndex(), 1, collocation);
    }
    this.setEntries(collocations);
    this.closeCollocation();
  }

  public deleteCollocation(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete collocation?')
      .subscribe((yes: boolean | undefined) => {
        if (yes) {
          // keep the edited collocation index in sync with the list
          const edited = this.editedIndex();
          if (edited === index) {
            this.closeCollocation();
          } else if (edited > index) {
            this.editedIndex.set(edited - 1);
          }
          const collocations = [...this.form.entries().value()];
          collocations.splice(index, 1);
          this.setEntries(collocations);
        }
      });
  }

  public moveCollocationUp(index: number): void {
    if (index < 1) {
      return;
    }
    const collocation = this.form.entries().value()[index];
    const collocations = [...this.form.entries().value()];
    collocations.splice(index, 1);
    collocations.splice(index - 1, 0, collocation);
    this.setEntries(collocations);
    this.followMovedCollocation(index, index - 1);
  }

  public moveCollocationDown(index: number): void {
    if (index + 1 >= this.form.entries().value().length) {
      return;
    }
    const collocation = this.form.entries().value()[index];
    const collocations = [...this.form.entries().value()];
    collocations.splice(index, 1);
    collocations.splice(index + 1, 0, collocation);
    this.setEntries(collocations);
    this.followMovedCollocation(index, index + 1);
  }

  /**
   * Keep the edited collocation index in sync with the list after the
   * collocation at index from has been swapped with the one at index to.
   */
  private followMovedCollocation(from: number, to: number): void {
    if (this.editedIndex() === from) {
      this.editedIndex.set(to);
    } else if (this.editedIndex() === to) {
      this.editedIndex.set(from);
    }
  }

  public parseDsl(): void {
    const dsl = this.dslForm.dslText().value();
    if (!dsl) {
      return;
    }
    try {
      // POS are typed as labels, like they are displayed
      const result = WordCollocationParser.parse(dsl, this.labelToIdMap());
      if (result.error) {
        this.dslError.set(`Error parsing DSL: ${result.error}`);
      } else {
        const collocations = [...this.form.entries().value()];
        collocations.push(...result.value);
        this.setEntries(collocations);
        this.dslError.set(undefined);
        // clear the parsed text, so that it cannot be added twice
        this._dsl.set({ dslText: '' });
        this.dslForm().reset();
      }
    } catch (e) {
      console.error(e);
    }
  }
}
