import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { EditedObject, PartIdentity, ThesauriSet } from '@myrmidon/cadmus-core';
import { AppRepository } from '@myrmidon/cadmus-state';
import { CadmusTextEdService } from '@myrmidon/cadmus-text-ed';

import { stubAssertedCompositeIds } from '../../../testing/asserted-composite-ids-stub';
import { createMonacoEditorMock, stubMonacoEditor } from '../../../testing/monaco';
import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { LEX_WORD_SENSES_PART_TYPEID, LexWordSensesPart } from '../../lex-word-senses-part';
import { WordSenseEditor } from '../word-sense-editor/word-sense-editor';
import { WordSenseExampleEditor } from '../word-sense-example-editor/word-sense-example-editor';
import { LexWordSensesPartEditor } from './lex-word-senses-part-editor';

const IDENTITY: PartIdentity = {
  itemId: 'item-1',
  typeId: LEX_WORD_SENSES_PART_TYPEID,
  partId: 'part-1',
  roleId: 'old',
};

function thesaurus(key: string, count: number) {
  return {
    id: key + '@en',
    language: 'en',
    entries: Array.from({ length: count }, (_, i) => ({ id: `${key}${i}`, value: `${key}${i}` })),
  };
}

const THESAURI: ThesauriSet = {
  'lex-word-sense-tags': {
    id: 'lex-word-sense-tags@en',
    language: 'en',
    entries: [
      { id: 'lit', value: 'literary' },
      { id: 'fam', value: 'familiar' },
    ],
  },
};

function createPart(): LexWordSensesPart {
  return {
    id: 'part-1',
    itemId: 'item-1',
    typeId: LEX_WORD_SENSES_PART_TYPEID,
    roleId: 'old',
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    senses: [
      { eid: 's1', tags: ['lit', 'fam'], definition: 'alpha', examples: [{ text: 'x' }] },
      { definition: 'beta' },
      { definition: 'gamma' },
    ],
  };
}

interface SetupOptions {
  part?: LexWordSensesPart;
  thesauri?: ThesauriSet;
  roles?: string[];
  settings?: unknown;
}

type UserEvent = ReturnType<typeof userEvent.setup>;

async function setup(options: SetupOptions = {}) {
  stubThesaurusEntriesPicker(WordSenseEditor, WordSenseExampleEditor);
  stubAssertedCompositeIds(WordSenseEditor);
  const monacoProviders = stubMonacoEditor(
    createMonacoEditorMock().editor,
    WordSenseEditor,
    WordSenseExampleEditor,
  );
  const user = userEvent.setup();
  const appUser = { userName: 'zeus', roles: options.roles ?? ['admin'] } as User;
  const getSettingFor = vi.fn(() => Promise.resolve(options.settings));
  const editorClose = vi.fn();
  const dirtyChange = vi.fn();
  const dataChange = vi.fn();

  const data: EditedObject<LexWordSensesPart> = {
    value: options.part ?? null,
    thesauri: options.thesauri ?? THESAURI,
  };
  const result = await render(LexWordSensesPartEditor, {
    inputs: { identity: IDENTITY, data },
    on: { editorClose, dirtyChange },
    providers: [
      ...monacoProviders,
      { provide: CadmusTextEdService, useValue: {} },
      {
        provide: AuthJwtService,
        useValue: {
          currentUser$: new BehaviorSubject<User | null>(appUser),
          currentUserValue: appUser,
        },
      },
      {
        provide: AppRepository,
        useValue: { getTypeThesaurus: () => undefined, getSettingFor },
      },
    ],
  });
  // dataChange is the output of the data model
  result.fixture.componentInstance.data.subscribe(dataChange);
  return { ...result, user, getSettingFor, editorClose, dirtyChange, dataChange };
}

function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: 'save' });
}

/** Get the senses table rows, header excluded. */
function senseRows(): HTMLElement[] {
  // the senses table is the first one; the sense editor may have its own
  const table = screen.queryAllByRole('table')[0];
  return table ? within(table).getAllByRole('row').slice(1) : [];
}

/** Get the definitions listed in the senses table, in their order. */
function listedDefinitions(): string[] {
  return senseRows().map((r) => within(r).getAllByRole('cell')[3].textContent!.trim());
}

function senseButton(index: number, description: string): HTMLElement {
  return within(senseRows()[index]).getByRole('button', { description });
}

function definitionEditor(): HTMLElement {
  return within(screen.getByRole('group', { name: 'definition' })).getByRole('textbox');
}

async function setDefinition(user: UserEvent, text: string) {
  await user.clear(definitionEditor());
  await user.type(definitionEditor(), text);
}

async function acceptSense(user: UserEvent) {
  await user.click(screen.getByRole('button', { description: 'Accept changes' }));
}

async function answerDialog(user: UserEvent, answer: 'yes' | 'no') {
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: answer }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('LexWordSensesPartEditor', () => {
  describe('loading', () => {
    it('should show the default title', async () => {
      await setup();
      expect(screen.getByText('Word Senses Part')).toBeInTheDocument();
    });

    it('should list the senses', async () => {
      await setup({ part: createPart() });
      const cells = senseRows().map((r) =>
        within(r)
          .getAllByRole('cell')
          .slice(1)
          .map((c) => c.textContent!.replace(/\s+/g, ' ').trim()),
      );
      expect(cells).toEqual([
        ['s1', 'literary , familiar', 'alpha', '1'],
        ['', '', 'beta', '0'],
        ['', '', 'gamma', '0'],
      ]);
    });

    it('should load the settings for the part role', async () => {
      const { getSettingFor } = await setup({ part: createPart() });
      expect(getSettingFor).toHaveBeenCalledWith(LEX_WORD_SENSES_PART_TYPEID, 'old');
    });

    it('should pass thesauri and lookup options to the related IDs editor', async () => {
      const { user } = await setup({
        part: createPart(),
        thesauri: {
          ...THESAURI,
          'asserted-id-scopes': thesaurus('s', 1),
          'asserted-id-tags': thesaurus('t', 2),
          'assertion-tags': thesaurus('a', 3),
          'doc-reference-types': thesaurus('r', 4),
          'doc-reference-tags': thesaurus('rt', 5),
          'asserted-id-features': thesaurus('f', 6),
        },
        settings: { lookupProviderOptions: { viaf: {} } },
      });
      await user.click(senseButton(0, 'Edit this Sense'));
      await user.click(screen.getByRole('tab', { name: 'related' }));
      const thesauri = await screen.findByLabelText('related IDs thesauri');
      expect(
        within(thesauri)
          .getAllByRole('definition')
          .map((dd) => dd.textContent),
      ).toEqual(['1', '2', '3', '4', '5', '6', 'set']);
    });

    it('should have no senses for a new part', async () => {
      await setup();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });
  });

  describe('editing senses', () => {
    it('should add a sense without saving the part', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await user.click(screen.getByRole('button', { name: 'sense' }));
      expect(screen.getByText('New sense')).toBeInTheDocument();
      await setDefinition(user, 'delta');
      await acceptSense(user);

      expect(listedDefinitions()).toEqual(['alpha', 'beta', 'gamma', 'delta']);
      expect(dataChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('group', { name: 'definition' })).not.toBeInTheDocument();
    });

    it('should edit a sense', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(senseButton(1, 'Edit this Sense'));
      expect(screen.getByText('Sense #2')).toBeInTheDocument();
      expect(definitionEditor()).toHaveValue('beta');
      await setDefinition(user, 'BETA');
      await acceptSense(user);
      expect(listedDefinitions()).toEqual(['alpha', 'BETA', 'gamma']);
    });

    it('should switch to another sense while editing', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(senseButton(0, 'Edit this Sense'));
      await user.click(senseButton(2, 'Edit this Sense'));
      expect(screen.getByText('Sense #3')).toBeInTheDocument();
      expect(definitionEditor()).toHaveValue('gamma');
    });

    it('should discard sense changes', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(senseButton(1, 'Edit this Sense'));
      await setDefinition(user, 'BETA');
      await user.click(screen.getByRole('button', { description: 'Discard changes' }));
      expect(screen.queryByRole('group', { name: 'definition' })).not.toBeInTheDocument();
      expect(listedDefinitions()).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should move senses', async () => {
      const { user } = await setup({ part: createPart() });
      expect(senseButton(0, 'Move this Sense up')).toBeDisabled();
      expect(senseButton(2, 'Move this Sense down')).toBeDisabled();
      await user.click(senseButton(2, 'Move this Sense up'));
      expect(listedDefinitions()).toEqual(['alpha', 'gamma', 'beta']);
      await user.click(senseButton(0, 'Move this Sense down'));
      expect(listedDefinitions()).toEqual(['gamma', 'alpha', 'beta']);
      expect(saveButton()).toBeEnabled();
    });

    it('should save the edited sense in its new position after moving', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(senseButton(0, 'Edit this Sense'));
      await user.click(senseButton(0, 'Move this Sense down'));
      expect(screen.getByText('Sense #2')).toBeInTheDocument();
      await user.click(senseButton(2, 'Move this Sense up'));
      expect(screen.getByText('Sense #3')).toBeInTheDocument();
      await setDefinition(user, 'ALPHA');
      await acceptSense(user);
      expect(listedDefinitions()).toEqual(['beta', 'gamma', 'ALPHA']);
    });

    it('should delete a sense after confirmation', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(senseButton(1, 'Delete this Sense'));
      await answerDialog(user, 'yes');
      expect(listedDefinitions()).toEqual(['alpha', 'gamma']);
    });

    it('should not delete a sense when not confirmed', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(senseButton(1, 'Delete this Sense'));
      await answerDialog(user, 'no');
      expect(listedDefinitions()).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should close the sense editor when deleting its sense', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(senseButton(1, 'Edit this Sense'));
      await user.click(senseButton(1, 'Delete this Sense'));
      await answerDialog(user, 'yes');
      expect(screen.queryByRole('group', { name: 'definition' })).not.toBeInTheDocument();
    });

    it('should save the edited sense in its place after deleting one before it', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(senseButton(2, 'Edit this Sense'));
      await user.click(senseButton(0, 'Delete this Sense'));
      await answerDialog(user, 'yes');
      expect(screen.getByText('Sense #2')).toBeInTheDocument();
      await setDefinition(user, 'GAMMA');
      await acceptSense(user);
      expect(listedDefinitions()).toEqual(['beta', 'GAMMA']);
    });
  });

  describe('saving', () => {
    it('should save the edited part', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await user.click(senseButton(1, 'Edit this Sense'));
      await setDefinition(user, 'BETA');
      await acceptSense(user);
      await user.click(saveButton());

      expect(dataChange).toHaveBeenCalledOnce();
      const saved = dataChange.mock.calls[0][0];
      expect(saved.value).toEqual(
        expect.objectContaining({
          id: 'part-1',
          typeId: LEX_WORD_SENSES_PART_TYPEID,
          senses: [
            createPart().senses[0],
            expect.objectContaining({ definition: 'BETA' }),
            createPart().senses[2],
          ],
        }),
      );
      expect(saved.thesauri).toEqual(THESAURI);
    });

    it('should save a new part', async () => {
      const { user, dataChange } = await setup();
      await user.click(screen.getByRole('button', { name: 'sense' }));
      await setDefinition(user, 'alpha');
      await acceptSense(user);
      await user.click(saveButton());
      // (the part ID, if any, comes from the identity)
      expect(dataChange.mock.calls[0][0].value).toEqual(
        expect.objectContaining({
          itemId: 'item-1',
          typeId: LEX_WORD_SENSES_PART_TYPEID,
          roleId: 'old',
          senses: [expect.objectContaining({ definition: 'alpha' })],
        }),
      );
    });

    it('should not save after removing all the senses', async () => {
      const { user, dataChange } = await setup({
        part: { ...createPart(), senses: [{ definition: 'alpha' }] },
      });
      await user.click(senseButton(0, 'Delete this Sense'));
      await answerDialog(user, 'yes');
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

    it('should emit dirtyChange when edited and saved', async () => {
      const { user, dirtyChange } = await setup({ part: createPart() });
      await user.click(senseButton(2, 'Move this Sense up'));
      expect(dirtyChange).toHaveBeenLastCalledWith(true);
      await user.click(saveButton());
      expect(dirtyChange).toHaveBeenLastCalledWith(false);
    });

    it('should reset the senses when the part is cleared', async () => {
      const { fixture } = await setup({ part: createPart() });
      fixture.componentRef.setInput('data', { value: null, thesauri: THESAURI });
      await fixture.whenStable();
      expect(listedDefinitions()).toEqual([]);
    });
  });
});
