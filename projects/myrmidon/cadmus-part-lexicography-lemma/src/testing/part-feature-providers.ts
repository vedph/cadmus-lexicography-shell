import { EnvironmentProviders, Provider } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { EditedObject, Part } from '@myrmidon/cadmus-core';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { AppRepository, PartEditorService } from '@myrmidon/cadmus-state';

export interface PartFeatureTestOptions<T extends Part> {
  /** The part type ID, used to build the route like the app does. */
  typeId: string;
  /** The part ID in the route, or 'new' (default). */
  partId?: string;
  /** The role ID in the route query, defaults to 'default' (=none). */
  roleId?: string;
  /** The data loaded by the editor service. */
  data?: EditedObject<T>;
  /** The error message when loading fails. */
  loadError?: string;
  /** The current user's roles, defaults to admin. */
  roles?: string[];
}

/**
 * Mocks for the services used by part editor features (wrappers of
 * part editors, derived from EditPartFeatureBase), and the providers
 * using them.
 */
export function createPartFeatureProviders<T extends Part>(options: PartFeatureTestOptions<T>) {
  const user = { userName: 'zeus', roles: options.roles ?? ['admin'] } as User;
  const editorService = {
    loading$: new BehaviorSubject(false),
    saving$: new BehaviorSubject(false),
    load: vi.fn(() =>
      options.loadError
        ? Promise.reject(new Error(options.loadError))
        : Promise.resolve(options.data),
    ),
    save: vi.fn((part: T) => Promise.resolve({ ...part, id: part.id || 'new-part-id' })),
  };
  const route = {
    snapshot: {
      params: { iid: 'item-1', pid: options.partId ?? 'new' },
      queryParams: { rid: options.roleId ?? 'default' },
      routeConfig: { path: `${options.typeId}/:pid` },
    },
  };
  const providers: (Provider | EnvironmentProviders)[] = [
    provideRouter([]),
    { provide: ActivatedRoute, useValue: route },
    { provide: PartEditorService, useValue: editorService },
    { provide: ItemService, useValue: {} },
    { provide: ThesaurusService, useValue: {} },
    {
      provide: EditedItemRepository,
      useValue: {
        item$: of({
          id: 'item-1',
          title: 'Test item',
          description: 'A test item',
          timeCreated: new Date(),
          creatorId: 'zeus',
          timeModified: new Date(),
          userId: 'zeus',
        }),
      },
    },
    {
      provide: AuthJwtService,
      useValue: {
        currentUser$: new BehaviorSubject<User | null>(user),
        currentUserValue: user,
      },
    },
    {
      provide: AppRepository,
      useValue: {
        getTypeThesaurus: () => undefined,
        getSettingFor: () => Promise.resolve(undefined),
      },
    },
  ];
  return { providers, editorService };
}
