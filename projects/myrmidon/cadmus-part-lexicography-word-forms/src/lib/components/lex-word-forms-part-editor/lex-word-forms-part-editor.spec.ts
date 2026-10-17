import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { EditedObject, PartIdentity, ThesauriSet } from '@myrmidon/cadmus-core';
import { WordFormEditor } from '@myrmidon/cadmus-part-lexicography-lemma';
import { AppRepository } from '@myrmidon/cadmus-state';

import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { LEX_WORD_FORMS_PART_TYPEID, LexWordFormsPart } from '../../lex-word-forms-part';
import { LexWordFormsPartEditor } from './lex-word-forms-part-editor';

const IDENTITY: PartIdentity = {
  itemId: 'item-1',
  typeId: LEX_WORD_FORMS_PART_TYPEID,
  partId: null,
  roleId: null,
};

function thesaurus(key: string, entries: { id: string; value: string }[]) {
  return { id: key + '@en', language: 'en', entries };
}

const THESAURI: ThesauriSet = {
  'lex-pos-tags': thesaurus('lex-pos-tags', [
    { id: 'n', value: 'noun' },
    { id: 'v', value: 'verb' },
  ]),
  'lex-word-form-types': thesaurus('lex-word-form-types', [{ id: 'pl', value: 'plural' }]),
};

function createPart(): LexWordFormsPart {
  return {
    id: 'part-1',
    itemId: 'item-1',
    typeId: LEX_WORD_FORMS_PART_TYPEID,
    roleId: undefined,
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    forms: [{ type: 'pl', value: 'cani', pos: 'n' }],
  };
}

interface SetupOptions {
  part?: LexWordFormsPart;
  thesauri?: ThesauriSet;
  roles?: string[];
}

async function setup(options: SetupOptions = {}) {
  stubThesaurusEntriesPicker(WordFormEditor);
  const user = userEvent.setup();
  const appUser = { userName: 'zeus', roles: options.roles ?? ['admin'] } as User;
  const editorClose = vi.fn();
  const dirtyChange = vi.fn();
  const dataChange = vi.fn();

  const data: EditedObject<LexWordFormsPart> = {
    value: options.part ?? null,
    thesauri: options.thesauri ?? THESAURI,
  };
  const result = await render(LexWordFormsPartEditor, {
    inputs: { identity: IDENTITY, data },
    on: { editorClose, dirtyChange },
    providers: [
      {
        provide: AuthJwtService,
        useValue: {
          currentUser$: new BehaviorSubject<User | null>(appUser),
          currentUserValue: appUser,
        },
      },
      {
        provide: AppRepository,
        useValue: {
          getTypeThesaurus: () => undefined,
          getSettingFor: () => Promise.resolve(undefined),
        },
      },
    ],
  });
  // dataChange is the output of the data model
  result.fixture.componentInstance.data.subscribe(dataChange);
  return { ...result, user, editorClose, dirtyChange, dataChange };
}

function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: 'save' });
}

/** Get the cells of the forms table rows, header excluded. */
function listedForms(): string[][] {
  return screen
    .queryAllByRole('row')
    .slice(1)
    .map((r) =>
      within(r)
        .getAllByRole('cell')
        .slice(1)
        .map((c) => c.textContent!.trim()),
    );
}

/** Add a new word form with the specified value via the forms editor. */
async function addForm(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.click(screen.getByRole('button', { name: 'form' }));
  await user.type(screen.getByRole('textbox', { name: 'value' }), value);
  await user.click(screen.getByRole('button', { description: 'Accept changes' }));
}

describe('LexWordFormsPartEditor', () => {
  describe('loading', () => {
    it('should show the default title', async () => {
      await setup();
      expect(screen.getByText('Word Forms Part')).toBeInTheDocument();
    });

    it('should load the part using thesauri', async () => {
      await setup({ part: createPart() });
      expect(listedForms()).toEqual([['plural', '', 'cani', '', 'noun']]);
    });

    it('should load the part without thesauri', async () => {
      await setup({ part: createPart(), thesauri: {} });
      expect(listedForms()).toEqual([['pl', '', 'cani', '', 'n']]);
    });

    it('should pass all the thesauri to the form editor', async () => {
      const { user } = await setup({
        part: createPart(),
        thesauri: {
          ...THESAURI,
          'lex-word-form-prefixes': thesaurus('p', [{ id: 'ri', value: 'ri-' }]),
          'lex-word-form-suffixes': thesaurus('s', [{ id: 'ino', value: '-ino' }]),
          'lex-word-form-features': thesaurus('f', [{ id: 'm', value: 'masculine' }]),
          'lex-word-form-tags': thesaurus('t', [{ id: 'rare', value: 'rare' }]),
        },
      });
      await user.click(screen.getByRole('button', { description: 'Edit this form' }));
      expect(screen.getByRole('combobox', { name: 'type' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'prefix' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'suffix' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'pick masculine' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'pick rare' })).toBeInTheDocument();
    });

    it('should have no forms for a new part', async () => {
      await setup();
      expect(listedForms()).toEqual([]);
    });
  });

  describe('saving', () => {
    it('should save the edited part', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await addForm(user, 'gatti');
      await user.click(saveButton());

      expect(dataChange).toHaveBeenCalledOnce();
      const saved = dataChange.mock.calls[0][0];
      expect(saved.value).toEqual(
        expect.objectContaining({
          id: 'part-1',
          itemId: 'item-1',
          typeId: LEX_WORD_FORMS_PART_TYPEID,
          forms: [
            { type: 'pl', value: 'cani', pos: 'n' },
            expect.objectContaining({ type: 'pl', value: 'gatti', pos: 'n' }),
          ],
        }),
      );
      expect(saved.thesauri).toEqual(THESAURI);
    });

    it('should save a new part', async () => {
      const { user, dataChange } = await setup();
      await addForm(user, 'cani');
      await user.click(saveButton());
      expect(dataChange.mock.calls[0][0].value).toEqual(
        expect.objectContaining({
          id: '',
          itemId: 'item-1',
          typeId: LEX_WORD_FORMS_PART_TYPEID,
          forms: [expect.objectContaining({ value: 'cani' })],
        }),
      );
    });

    it('should not save the part when accepting a word form', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await addForm(user, 'gatti');
      expect(listedForms()).toHaveLength(2);
      expect(dataChange).not.toHaveBeenCalled();
      expect(saveButton()).toBeEnabled();
    });

    it('should not save the part on Enter in a word form', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await user.click(screen.getByRole('button', { name: 'form' }));
      await user.type(screen.getByRole('textbox', { name: 'value' }), 'gatti{Enter}');
      // Enter accepted the word form only
      expect(listedForms()).toHaveLength(2);
      expect(dataChange).not.toHaveBeenCalled();
    });

    it('should render no <form> element, also with a word form open', async () => {
      const { user, container } = await setup({ part: createPart() });
      await user.click(screen.getByRole('button', { description: 'Edit this form' }));
      expect(container.querySelector('form')).toBeNull();
    });

    it('should not save without forms', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await user.click(screen.getByRole('button', { description: 'Delete this form' }));
      await user.click(await screen.findByRole('button', { name: 'yes' }));
      // while the dialog is open, the rest of the page is hidden from queries
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(listedForms()).toEqual([]);
      expect(saveButton()).toBeDisabled();
      expect(dataChange).not.toHaveBeenCalled();
    });

    it('should hide save for users below operator level', async () => {
      await setup({ part: createPart(), roles: ['visitor'] });
      expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
    });
  });

  describe('state', () => {
    it('should emit editorClose on close', async () => {
      const { user, editorClose } = await setup({ part: createPart() });
      await user.click(screen.getByRole('button', { name: 'close' }));
      expect(editorClose).toHaveBeenCalledOnce();
    });

    it('should be pristine after loading a part', async () => {
      const { fixture, dirtyChange } = await setup({ part: createPart() });
      await fixture.whenStable();
      expect(dirtyChange).not.toHaveBeenCalledWith(true);
      expect(fixture.componentInstance.isDirty()).toBe(false);
    });

    it('should emit dirtyChange when edited and saved', async () => {
      const { user, dirtyChange } = await setup({ part: createPart() });
      await addForm(user, 'gatti');
      expect(dirtyChange).toHaveBeenLastCalledWith(true);
      await user.click(saveButton());
      expect(dirtyChange).toHaveBeenLastCalledWith(false);
    });

    it('should reset the forms when the part is cleared', async () => {
      const { fixture } = await setup({ part: createPart() });
      fixture.componentRef.setInput('data', { value: null, thesauri: THESAURI });
      await fixture.whenStable();
      expect(listedForms()).toEqual([]);
    });
  });
});
