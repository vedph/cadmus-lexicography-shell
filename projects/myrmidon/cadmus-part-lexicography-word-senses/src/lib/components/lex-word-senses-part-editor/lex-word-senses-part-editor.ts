import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  UntypedFormGroup,
  ReactiveFormsModule,
} from '@angular/forms';

import { TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EllipsisPipe, FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { CloseSaveButtonsComponent, ModelEditorComponentBase } from '@myrmidon/cadmus-ui';
import { EditedObject, ThesauriSet, ThesaurusEntry } from '@myrmidon/cadmus-core';
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
 * Word senses part editor component.
 * Thesauri: lex-word-sense-tags, asserted-id-scopes, asserted-id-tags,
 * assertion-tags, doc-reference-types, doc-reference-tags, asserted-id-features.
 */
@Component({
  selector: 'cadmus-lex-word-senses-part-editor',
  imports: [
    ReactiveFormsModule,
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
export class LexWordSensesPartEditor
  extends ModelEditorComponentBase<LexWordSensesPart>
  implements OnInit
{
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<WordSense | undefined>(undefined);

  // lex-word-sense-tags
  public readonly tagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // asserted-id-scopes
  public readonly assIdScopeEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // asserted-id-tags
  public readonly assIdTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // assertion-tags
  public readonly assTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // doc-reference-types
  public readonly refTypeEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // doc-reference-tags
  public readonly refTagEntries = signal<ThesaurusEntry[] | undefined>(undefined);
  // asserted-id-features
  public readonly idFeatureEntries = signal<ThesaurusEntry[] | undefined>(undefined);

  // lookup options depending on role
  public readonly lookupProviderOptions = signal<LookupProviderOptions | undefined>(undefined);

  public entries: FormControl<WordSense[]>;

  constructor(
    authService: AuthJwtService,
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
  ) {
    super(authService, formBuilder);
    // form
    this.entries = formBuilder.control([], {
      // at least 1 entry
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
  }

  protected buildForm(formBuilder: FormBuilder): FormGroup | UntypedFormGroup {
    return formBuilder.group({
      entries: this.entries,
    });
  }

  private updateThesauri(thesauri: ThesauriSet): void {
    const entries = (key: string) =>
      this.hasThesaurus(key) ? thesauri[key].entries : undefined;
    this.tagEntries.set(entries('lex-word-sense-tags'));
    this.assIdScopeEntries.set(entries('asserted-id-scopes'));
    this.assIdTagEntries.set(entries('asserted-id-tags'));
    this.assTagEntries.set(entries('assertion-tags'));
    this.refTypeEntries.set(entries('doc-reference-types'));
    this.refTagEntries.set(entries('doc-reference-tags'));
    this.idFeatureEntries.set(entries('asserted-id-features'));
  }

  private updateForm(part?: LexWordSensesPart | null): void {
    if (!part) {
      this.form.reset();
      return;
    }
    this.entries.setValue(part.senses || []);
    this.form.markAsPristine();
  }

  protected override onDataSet(data?: EditedObject<LexWordSensesPart>): void {
    // thesauri
    if (data?.thesauri) {
      this.updateThesauri(data.thesauri);
    }
    // settings
    this._appRepository
      ?.getSettingFor<LexWordSensesPartSettings>(
        LEX_WORD_SENSES_PART_TYPEID,
        this.identity()?.roleId || undefined,
      )
      .then((settings) => {
        const options = settings?.lookupProviderOptions;
        this.lookupProviderOptions.set(options || undefined);
      });
    // form
    this.updateForm(data?.value);
  }

  protected getValue(): LexWordSensesPart {
    let part = this.getEditedPart(LEX_WORD_SENSES_PART_TYPEID) as LexWordSensesPart;
    part.senses = this.entries.value || [];
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
    this.edited.set(structuredClone(entry));
  }

  public closeSense(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveSense(entry: WordSense): void {
    const entries = [...this.entries.value];
    if (this.editedIndex() === -1) {
      entries.push(entry);
    } else {
      entries.splice(this.editedIndex(), 1, entry);
    }
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
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
          const entries = [...this.entries.value];
          entries.splice(index, 1);
          this.entries.setValue(entries);
          this.entries.markAsDirty();
          this.entries.updateValueAndValidity();
        }
      });
  }

  public moveSenseUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
    this.followMovedSense(index, index - 1);
  }

  public moveSenseDown(index: number): void {
    if (index + 1 >= this.entries.value.length) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
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
