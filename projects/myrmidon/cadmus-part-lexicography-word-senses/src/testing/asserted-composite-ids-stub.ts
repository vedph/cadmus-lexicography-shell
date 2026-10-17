import { ChangeDetectionStrategy, Component, input, model, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  AssertedCompositeId,
  AssertedCompositeIdsComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';

/**
 * Test stand-in for AssertedCompositeIdsComponent, with its same selector
 * and the API used by this library. It lists the IDs labels, the number of
 * entries of each received thesaurus, whether it got lookup options, and has
 * an "add ID" button adding an ID whose GID and label are equal to "id" plus
 * its ordinal number.
 */
@Component({
  selector: 'cadmus-refs-asserted-composite-ids',
  template: `
    <ul aria-label="related IDs">
      @for (id of ids(); track $index) {
        <li>{{ id.target.label }}</li>
      }
    </ul>
    <dl aria-label="related IDs thesauri">
      <dt>scopes</dt>
      <dd>{{ idScopeEntries()?.length ?? 'none' }}</dd>
      <dt>ID tags</dt>
      <dd>{{ idTagEntries()?.length ?? 'none' }}</dd>
      <dt>assertion tags</dt>
      <dd>{{ assTagEntries()?.length ?? 'none' }}</dd>
      <dt>reference types</dt>
      <dd>{{ refTypeEntries()?.length ?? 'none' }}</dd>
      <dt>reference tags</dt>
      <dd>{{ refTagEntries()?.length ?? 'none' }}</dd>
      <dt>features</dt>
      <dd>{{ featureEntries()?.length ?? 'none' }}</dd>
      <dt>lookup options</dt>
      <dd>{{ lookupProviderOptions() ? 'set' : 'none' }}</dd>
    </dl>
    <button type="button" (click)="add()">add ID</button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedCompositeIdsStub {
  public readonly ids = model<AssertedCompositeId[]>([]);
  public readonly idScopeEntries = input<ThesaurusEntry[] | undefined>();
  public readonly idTagEntries = input<ThesaurusEntry[] | undefined>();
  public readonly assTagEntries = input<ThesaurusEntry[] | undefined>();
  public readonly refTypeEntries = input<ThesaurusEntry[] | undefined>();
  public readonly refTagEntries = input<ThesaurusEntry[] | undefined>();
  public readonly featureEntries = input<ThesaurusEntry[] | undefined>();
  public readonly lookupProviderOptions = input<LookupProviderOptions | undefined>();

  public add(): void {
    const n = this.ids().length + 1;
    this.ids.set([...this.ids(), { target: { gid: `id${n}`, label: `id${n}` } }]);
  }
}

/**
 * Replace the real asserted composite IDs editor with AssertedCompositeIdsStub
 * in the specified components. Call before rendering.
 */
export function stubAssertedCompositeIds(...components: Type<unknown>[]): void {
  for (const component of components) {
    TestBed.overrideComponent(component, {
      remove: { imports: [AssertedCompositeIdsComponent] },
      add: { imports: [AssertedCompositeIdsStub] },
    });
  }
}
