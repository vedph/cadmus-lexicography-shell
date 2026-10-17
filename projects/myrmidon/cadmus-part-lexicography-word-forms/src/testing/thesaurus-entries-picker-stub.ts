import { ChangeDetectionStrategy, Component, input, model, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';

/**
 * Test stand-in for ThesaurusEntriesPickerComponent, with its same selector
 * and API. The real picker wraps a paged tree browser which is impractical
 * to drive in unit tests: this one renders a "pick <label>" button for each
 * available entry and a "remove <label>" button for each picked entry,
 * honoring maxEntries like the real one.
 */
@Component({
  selector: 'cadmus-thesaurus-entries-picker',
  template: `
    <ul aria-label="picked entries">
      @for (e of entries(); track e.id) {
        <li>
          {{ e.value }}
          <button type="button" (click)="remove(e)">remove {{ e.value }}</button>
        </li>
      }
    </ul>
    @for (e of availableEntries(); track e.id) {
      <button type="button" (click)="pick(e)">pick {{ e.value }}</button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThesaurusEntriesPickerStub {
  public readonly availableEntries = input.required<ThesaurusEntry[]>();
  public readonly entries = model<ThesaurusEntry[]>([]);
  public readonly hierarchicLabels = input<boolean>(false);
  public readonly autoSort = input<boolean>(false);
  public readonly allowCustom = input<boolean>(false);
  public readonly minEntries = input<number>(0);
  public readonly maxEntries = input<number>(0);
  public readonly expanded = model<boolean>(false);
  public readonly emptyMessage = input<string>('no entries');

  public pick(entry: ThesaurusEntry): void {
    if (this.entries().some((e) => e.id === entry.id)) {
      return;
    }
    if (this.maxEntries() && this.entries().length >= this.maxEntries()) {
      return;
    }
    this.entries.set([...this.entries(), entry]);
  }

  public remove(entry: ThesaurusEntry): void {
    this.entries.set(this.entries().filter((e) => e.id !== entry.id));
  }
}

/**
 * Replace the real thesaurus entries picker with ThesaurusEntriesPickerStub
 * in the specified components. Call before rendering.
 */
export function stubThesaurusEntriesPicker(...components: Type<unknown>[]): void {
  for (const component of components) {
    TestBed.overrideComponent(component, {
      remove: { imports: [ThesaurusEntriesPickerComponent] },
      add: { imports: [ThesaurusEntriesPickerStub] },
    });
  }
}
