import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { EditedObject, PartIdentity, ThesauriSet } from '@myrmidon/cadmus-core';
import { AppRepository } from '@myrmidon/cadmus-state';

import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { LEX_LEMMA_PART_TYPEID, LexLemmaPart } from '../../lex-lemma-part';
import { WordFormEditor } from '../word-form-editor/word-form-editor';
import {
  LEX_LEMMA_PART_LID_GENERATOR_TOKEN,
  LexLemmaPartEditor,
  LidGenerator,
} from './lex-lemma-part-editor';

const IDENTITY: PartIdentity = {
  itemId: 'item-1',
  typeId: LEX_LEMMA_PART_TYPEID,
  partId: null,
  roleId: null,
};

const THESAURI: ThesauriSet = {
  'lex-pos-tags': {
    id: 'lex-pos-tags@en',
    language: 'en',
    entries: [
      { id: 'n', value: 'noun' },
      { id: 'v', value: 'verb' },
    ],
  },
  'lex-word-form-types': {
    id: 'lex-word-form-types@en',
    language: 'en',
    entries: [{ id: 'lemma', value: 'lemma form' }],
  },
};

function createPart(): LexLemmaPart {
  return {
    id: 'part-1',
    itemId: 'item-1',
    typeId: LEX_LEMMA_PART_TYPEID,
    roleId: undefined,
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    lid: 'cane',
    homograph: 2,
    forms: [{ type: 'lemma', value: 'cane', pos: 'n' }],
  };
}

interface SetupOptions {
  part?: LexLemmaPart;
  thesauri?: ThesauriSet;
  roles?: string[];
}

async function setup(options: SetupOptions = {}) {
  stubThesaurusEntriesPicker(WordFormEditor);
  const user = userEvent.setup();
  const appUser = { userName: 'zeus', roles: options.roles ?? ['admin'] } as User;
  const lidGenerator: LidGenerator = { getLid: vi.fn(() => 'generated-lid') };
  const editorClose = vi.fn();
  const dirtyChange = vi.fn();
  const dataChange = vi.fn();

  const data: EditedObject<LexLemmaPart> = {
    value: options.part ?? null,
    thesauri: options.thesauri ?? THESAURI,
  };
  const result = await render(LexLemmaPartEditor, {
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
      { provide: LEX_LEMMA_PART_LID_GENERATOR_TOKEN, useValue: lidGenerator },
    ],
  });
  // dataChange is the output of the data model
  result.fixture.componentInstance.data.subscribe(dataChange);
  return { ...result, user, lidGenerator, editorClose, dirtyChange, dataChange };
}

function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: 'save' });
}

/** Get the values listed in the forms table, in their order. */
function listedForms(): string[] {
  return screen
    .queryAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[3].textContent!.trim());
}

/** Add a new word form with the specified value via the forms editor. */
async function addForm(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.click(screen.getByRole('button', { name: 'form' }));
  await user.type(screen.getByRole('textbox', { name: 'value' }), value);
  await user.click(screen.getByRole('button', { description: 'Accept changes' }));
}

describe('LexLemmaPartEditor', () => {
  describe('loading', () => {
    it('should show the default title', async () => {
      await setup();
      expect(screen.getByText('Lemma Part')).toBeInTheDocument();
    });

    it('should load the part', async () => {
      await setup({ part: createPart() });
      expect(screen.getByRole('textbox', { name: 'LID' })).toHaveValue('cane');
      expect(screen.getByRole('spinbutton', { name: 'hom.' })).toHaveValue(2);
      expect(listedForms()).toEqual(['cane']);
    });

    it('should use thesauri in the forms list', async () => {
      await setup({ part: createPart() });
      const cells = within(screen.getAllByRole('row')[1])
        .getAllByRole('cell')
        .map((c) => c.textContent!.trim());
      expect(cells).toContain('lemma form');
      expect(cells).toContain('noun');
    });

    it('should pass all the thesauri to the form editor', async () => {
      const entries = (id: string, value: string) => ({
        id: id + '@en',
        language: 'en',
        entries: [{ id, value }],
      });
      const { user } = await setup({
        part: createPart(),
        thesauri: {
          ...THESAURI,
          'lex-word-form-prefixes': entries('ri', 'ri-'),
          'lex-word-form-suffixes': entries('ino', '-ino'),
          'lex-word-form-features': entries('m', 'masculine'),
          'lex-word-form-tags': entries('rare', 'rare'),
        },
      });
      await user.click(screen.getByRole('button', { description: 'Edit this form' }));
      expect(screen.getByRole('combobox', { name: 'type' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'prefix' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'suffix' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'pick masculine' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'pick rare' })).toBeInTheDocument();
    });

    it('should work without thesauri', async () => {
      await setup({ part: createPart(), thesauri: {} });
      const cells = within(screen.getAllByRole('row')[1])
        .getAllByRole('cell')
        .map((c) => c.textContent!.trim());
      expect(cells).toContain('lemma');
      expect(cells).toContain('n');
    });

    it('should have empty fields for a new part', async () => {
      await setup();
      expect(screen.getByRole('textbox', { name: 'LID' })).toHaveValue('');
      expect(listedForms()).toEqual([]);
    });
  });

  describe('saving', () => {
    it('should save the edited part', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      const lid = screen.getByRole('textbox', { name: 'LID' });
      await user.clear(lid);
      await user.type(lid, 'gatto');
      const hom = screen.getByRole('spinbutton', { name: 'hom.' });
      await user.clear(hom);
      await user.type(hom, '1');
      await addForm(user, 'gatti');

      await user.click(saveButton());

      expect(dataChange).toHaveBeenCalledOnce();
      const saved: LexLemmaPart = dataChange.mock.calls[0][0].value;
      expect(saved).toEqual(
        expect.objectContaining({
          id: 'part-1',
          itemId: 'item-1',
          typeId: LEX_LEMMA_PART_TYPEID,
          lid: 'gatto',
          homograph: 1,
          forms: [
            { type: 'lemma', value: 'cane', pos: 'n' },
            expect.objectContaining({ type: 'lemma', value: 'gatti', pos: 'n' }),
          ],
        }),
      );
      // thesauri are preserved
      expect(dataChange.mock.calls[0][0].thesauri).toEqual(THESAURI);
    });

    it('should save a new part', async () => {
      const { user, dataChange } = await setup();
      await user.type(screen.getByRole('textbox', { name: 'LID' }), 'cane');
      await addForm(user, 'cane');
      await user.click(saveButton());

      const saved: LexLemmaPart = dataChange.mock.calls[0][0].value;
      expect(saved).toEqual(
        expect.objectContaining({
          id: '',
          itemId: 'item-1',
          typeId: LEX_LEMMA_PART_TYPEID,
          lid: 'cane',
          homograph: undefined,
          forms: [expect.objectContaining({ value: 'cane' })],
        }),
      );
    });

    it('should not save the part when accepting a word form', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await addForm(user, 'cani');
      expect(listedForms()).toEqual(['cane', 'cani']);
      expect(dataChange).not.toHaveBeenCalled();
      // the part is still to be saved
      expect(saveButton()).toBeEnabled();
    });

    it('should not save without forms', async () => {
      const { user, dataChange } = await setup();
      await user.type(screen.getByRole('textbox', { name: 'LID' }), 'cane');
      expect(saveButton()).toBeDisabled();
      // submit anyway (e.g. by Enter)
      await user.type(screen.getByRole('textbox', { name: 'LID' }), '{Enter}');
      expect(dataChange).not.toHaveBeenCalled();
    });

    it('should not save after removing all the forms', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(screen.getByRole('button', { description: 'Delete this form' }));
      await user.click(await screen.findByRole('button', { name: 'yes' }));
      // while the dialog is open, the rest of the page is hidden from queries
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(listedForms()).toEqual([]);
      expect(saveButton()).toBeDisabled();
    });

    it('should require a LID', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await user.clear(screen.getByRole('textbox', { name: 'LID' }));
      await user.tab();
      expect(screen.getByText('LID required')).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
      expect(dataChange).not.toHaveBeenCalled();
    });

    it('should report a too long LID', async () => {
      const { user } = await setup({ part: createPart() });
      const lid = screen.getByRole('textbox', { name: 'LID' });
      await user.clear(lid);
      await user.click(lid);
      await user.paste('x'.repeat(301));
      await user.tab();
      expect(screen.getByText('LID too long')).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it('should hide save for users below operator level', async () => {
      await setup({ part: createPart(), roles: ['visitor'] });
      expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'close' })).toBeInTheDocument();
    });

    it('should show save for operators', async () => {
      await setup({ part: createPart(), roles: ['operator'] });
      expect(saveButton()).toBeInTheDocument();
    });
  });

  describe('LID generation', () => {
    it('should generate the LID from the current part', async () => {
      const { user, lidGenerator } = await setup({ part: createPart() });
      await addForm(user, 'cani');
      await user.click(screen.getByRole('button', { description: 'Generate LID' }));

      expect(lidGenerator.getLid).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          lid: 'cane',
          forms: [expect.objectContaining({ value: 'cane' }), expect.objectContaining({ value: 'cani' })],
        }),
      );
      expect(screen.getByRole('textbox', { name: 'LID' })).toHaveValue('generated-lid');
      expect(saveButton()).toBeEnabled();
    });
  });

  describe('state', () => {
    it('should emit editorClose on close', async () => {
      const { user, editorClose } = await setup({ part: createPart() });
      await user.click(screen.getByRole('button', { name: 'close' }));
      expect(editorClose).toHaveBeenCalledOnce();
    });

    it('should emit dirtyChange when edited and saved', async () => {
      const { user, dirtyChange } = await setup({ part: createPart() });
      await user.type(screen.getByRole('textbox', { name: 'LID' }), 's');
      expect(dirtyChange).toHaveBeenLastCalledWith(true);
      await user.click(saveButton());
      expect(dirtyChange).toHaveBeenLastCalledWith(false);
    });

    it('should disable the form when disabled', async () => {
      const { fixture } = await setup({ part: createPart() });
      fixture.componentRef.setInput('disabled', true);
      await fixture.whenStable();
      expect(screen.getByRole('textbox', { name: 'LID' })).toBeDisabled();
    });
  });
});
