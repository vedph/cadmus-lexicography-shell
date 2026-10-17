import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { EditedObject, PartIdentity, ThesauriSet } from '@myrmidon/cadmus-core';
import { AppRepository } from '@myrmidon/cadmus-state';

import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import {
  LEX_WORD_COLLOCATIONS_PART_TYPEID,
  LexWordCollocationsPart,
  WordCollocation,
} from '../../lex-word-collocations-part';
import { WordCollocLiteralEditor } from '../word-colloc-literal-editor/word-colloc-literal-editor';
import { WordCollocTokenEditor } from '../word-colloc-token-editor/word-colloc-token-editor';
import { LexWordCollocationPartEditor } from './lex-word-collocations-part-editor';

const IDENTITY: PartIdentity = {
  itemId: 'item-1',
  typeId: LEX_WORD_COLLOCATIONS_PART_TYPEID,
  partId: 'part-1',
  roleId: null,
};

const THESAURI: ThesauriSet = {
  'lex-word-ctoken-pos-tags': {
    id: 'lex-word-ctoken-pos-tags@en',
    language: 'en',
    entries: [
      { id: 'a', value: 'ADJ' },
      { id: 'n', value: 'NOUN' },
    ],
  },
  'lex-word-collocation-tags': {
    id: 'lex-word-collocation-tags@en',
    language: 'en',
    entries: [{ id: 'fx', value: 'fixed' }],
  },
};

function collocation(value: string, rank?: number): WordCollocation {
  return {
    tag: 'fx',
    rank,
    tokens: [{ pos: 'a' }, { pos: 'n', isHead: true }],
    examples: [
      { tokenNr: 1, literals: [{ value: 'strong' }] },
      { tokenNr: 2, literals: [{ value }] },
    ],
  };
}

function createPart(): LexWordCollocationsPart {
  return {
    id: 'part-1',
    itemId: 'item-1',
    typeId: LEX_WORD_COLLOCATIONS_PART_TYPEID,
    timeCreated: new Date(),
    creatorId: 'zeus',
    timeModified: new Date(),
    userId: 'zeus',
    collocations: [collocation('alpha', 1), collocation('beta'), collocation('gamma')],
  };
}

interface SetupOptions {
  part?: LexWordCollocationsPart;
  thesauri?: ThesauriSet;
  roles?: string[];
}

type UserEvent = ReturnType<typeof userEvent.setup>;

async function setup(options: SetupOptions = {}) {
  stubThesaurusEntriesPicker(WordCollocTokenEditor, WordCollocLiteralEditor);
  const user = userEvent.setup();
  const appUser = { userName: 'zeus', roles: options.roles ?? ['admin'] } as User;
  const editorClose = vi.fn();
  const dirtyChange = vi.fn();
  const dataChange = vi.fn();
  const data: EditedObject<LexWordCollocationsPart> = {
    value: options.part ?? null,
    thesauri: options.thesauri ?? THESAURI,
  };
  const result = await render(LexWordCollocationPartEditor, {
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

/** Get the collocations table rows (the first table), header excluded. */
function rows(): HTMLElement[] {
  const table = screen.queryAllByRole('table')[0];
  return table ? within(table).getAllByRole('row').slice(1) : [];
}

function listed(): string[][] {
  return rows().map((r) =>
    within(r)
      .getAllByRole('cell')
      .slice(1)
      .map((c) => c.textContent!.trim()),
  );
}

/** Get the last examples literal of each listed collocation. */
function listedValues(): string[] {
  return listed().map((r) => r[2].split(' ').at(-1)!.replace(/[<>]/g, ''));
}

function rowButton(index: number, description: string): HTMLElement {
  return within(rows()[index]).getByRole('button', { description });
}

function dslText(): HTMLElement {
  return screen.getByPlaceholderText('collocation(s), one per line');
}

/** Type the DSL text (pasting it, as brackets are special for user.type). */
async function typeDsl(user: UserEvent, text: string) {
  await user.click(dslText());
  await user.paste(text);
}

/** The collocation editor's accept button (the last one before part buttons). */
function acceptCollocationButton(): HTMLElement {
  return screen.getAllByRole('button', { description: 'Accept changes' }).at(-1)!;
}

async function answerDialog(user: UserEvent, answer: 'yes' | 'no') {
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: answer }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

/** Change the edited collocation's rank, and accept it. */
async function setEditedRank(user: UserEvent, rank: string) {
  const input = screen.getByRole('spinbutton', { name: 'rank' });
  await user.clear(input);
  await user.type(input, rank);
  await user.click(acceptCollocationButton());
}

describe('LexWordCollocationPartEditor', () => {
  describe('loading', () => {
    it('should show the default title', async () => {
      await setup();
      expect(screen.getByText('Word Collocations Part')).toBeInTheDocument();
    });

    it('should list the collocations with thesauri labels', async () => {
      await setup({ part: createPart() });
      expect(listed()).toEqual([
        ['fixed', '1', '(1) ADJ+<NOUN>: [strong] <alpha>'],
        ['fixed', '2', 'ADJ+<NOUN>: [strong] <beta>'],
        ['fixed', '3', 'ADJ+<NOUN>: [strong] <gamma>'],
      ]);
    });

    it('should list the collocations without thesauri', async () => {
      await setup({ part: createPart(), thesauri: {} });
      expect(listed()[0]).toEqual(['fx', '1', '(1) a+<n>: [strong] <alpha>']);
    });

    it('should have no collocations for a new part', async () => {
      await setup();
      expect(rows()).toHaveLength(0);
      expect(saveButton()).toBeDisabled();
    });
  });

  describe('editing collocations', () => {
    it('should add a collocation without saving the part', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await user.click(screen.getByRole('button', { name: 'collocation' }));
      expect(screen.getByText('New collocation')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'token' }));
      await user.click(screen.getByRole('checkbox', { name: 'head' }));
      await user.click(screen.getAllByRole('button', { description: 'Accept changes' })[0]);
      await user.click(acceptCollocationButton());

      expect(listed()).toHaveLength(4);
      expect(listed()[3][2]).toBe('<ADJ>:');
      expect(dataChange).not.toHaveBeenCalled();
      expect(saveButton()).toBeEnabled();
    });

    it('should edit a collocation', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(rowButton(1, 'Edit this collocation'));
      expect(screen.getByText('Collocation #2')).toBeInTheDocument();
      await setEditedRank(user, '5');
      expect(listed()[1][2]).toBe('(5) ADJ+<NOUN>: [strong] <beta>');
    });

    it('should close the collocation editor on discard', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(rowButton(1, 'Edit this collocation'));
      await user.click(screen.getAllByRole('button', { description: 'Discard changes' }).at(-1)!);
      expect(screen.queryByRole('spinbutton', { name: 'rank' })).not.toBeInTheDocument();
    });

    it('should move collocations', async () => {
      const { user } = await setup({ part: createPart() });
      expect(rowButton(0, 'Move this collocation up')).toBeDisabled();
      expect(rowButton(2, 'Move this collocation down')).toBeDisabled();
      await user.click(rowButton(2, 'Move this collocation up'));
      expect(listedValues()).toEqual(['alpha', 'gamma', 'beta']);
      await user.click(rowButton(0, 'Move this collocation down'));
      expect(listedValues()).toEqual(['gamma', 'alpha', 'beta']);
      expect(saveButton()).toBeEnabled();
    });

    it('should save the edited collocation in its new position after moving', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(rowButton(0, 'Edit this collocation'));
      await user.click(rowButton(0, 'Move this collocation down'));
      expect(screen.getByText('Collocation #2')).toBeInTheDocument();
      await user.click(rowButton(2, 'Move this collocation up'));
      expect(screen.getByText('Collocation #3')).toBeInTheDocument();
      await setEditedRank(user, '9');
      expect(listed().map((r) => r[2].startsWith('(9)'))).toEqual([false, false, true]);
      expect(listedValues()).toEqual(['beta', 'gamma', 'alpha']);
    });

    it('should highlight the edited collocation', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(rowButton(1, 'Edit this collocation'));
      expect(rows()[1]).toHaveClass('selected');
      expect(rows()[0]).not.toHaveClass('selected');
    });

    it('should delete a collocation after confirmation', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(rowButton(1, 'Delete this collocation'));
      await answerDialog(user, 'yes');
      expect(listedValues()).toEqual(['alpha', 'gamma']);
    });

    it('should not delete a collocation when not confirmed', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(rowButton(1, 'Delete this collocation'));
      await answerDialog(user, 'no');
      expect(listedValues()).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should close the collocation editor when deleting its collocation', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(rowButton(1, 'Edit this collocation'));
      await user.click(rowButton(1, 'Delete this collocation'));
      await answerDialog(user, 'yes');
      expect(screen.queryByRole('spinbutton', { name: 'rank' })).not.toBeInTheDocument();
    });

    it('should save the edited collocation in its place after deleting one before it', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(rowButton(2, 'Edit this collocation'));
      await user.click(rowButton(0, 'Delete this collocation'));
      await answerDialog(user, 'yes');
      expect(screen.getByText('Collocation #2')).toBeInTheDocument();
      await setEditedRank(user, '7');
      expect(listed().map((r) => r[2])).toEqual([
        'ADJ+<NOUN>: [strong] <beta>',
        '(7) ADJ+<NOUN>: [strong] <gamma>',
      ]);
    });
  });

  describe('batch', () => {
    it('should add parsed collocations, mapping POS labels to IDs', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await typeDsl(user, '(4) ADJ+<NOUN>: [forte] <tè>');
      await user.click(screen.getByRole('button', { description: 'Parse collocations and add them' }));

      expect(listed()[3][2]).toBe('(4) ADJ+<NOUN>: [forte] <tè>');
      expect(dslText()).toHaveValue('');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(dataChange).not.toHaveBeenCalled();

      await user.click(saveButton());
      expect(dataChange.mock.calls[0][0].value.collocations[3]).toEqual({
        rank: 4,
        tokens: [{ pos: 'a', isHead: undefined }, { pos: 'n', isHead: true }],
        examples: [
          { tokenNr: 1, literals: [{ value: 'forte' }] },
          { tokenNr: 2, literals: [{ value: 'tè' }] },
        ],
      });
    });

    it('should add multiple collocations', async () => {
      const { user } = await setup();
      await typeDsl(user, 'ADJ+<NOUN>: [forte] <tè>\n<NOUN>+ADJ: <tè> [nero]');
      await user.click(screen.getByRole('button', { description: 'Parse collocations and add them' }));
      expect(listed().map((r) => r[2])).toEqual([
        'ADJ+<NOUN>: [forte] <tè>',
        '<NOUN>+ADJ: <tè> [nero]',
      ]);
      expect(saveButton()).toBeEnabled();
    });

    it('should show parse errors and add nothing', async () => {
      const { user } = await setup({ part: createPart() });
      await typeDsl(user, 'ADJ+NOUN: x');
      await user.click(screen.getByRole('button', { description: 'Parse collocations and add them' }));
      expect(screen.getByRole('alert')).toHaveTextContent('No head token found');
      expect(listed()).toHaveLength(3);
      expect(dslText()).toHaveValue('ADJ+NOUN: x');
    });

    it('should do nothing without text', async () => {
      const { user } = await setup({ part: createPart() });
      await user.click(screen.getByRole('button', { description: 'Parse collocations and add them' }));
      expect(listed()).toHaveLength(3);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('should save the edited part', async () => {
      const { user, dataChange } = await setup({ part: createPart() });
      await user.click(rowButton(2, 'Move this collocation up'));
      await user.click(saveButton());
      expect(dataChange).toHaveBeenCalledOnce();
      const saved = dataChange.mock.calls[0][0];
      const part = createPart();
      expect(saved.value).toEqual(
        expect.objectContaining({
          id: 'part-1',
          typeId: LEX_WORD_COLLOCATIONS_PART_TYPEID,
          collocations: [part.collocations[0], part.collocations[2], part.collocations[1]],
        }),
      );
      expect(saved.thesauri).toEqual(THESAURI);
    });

    it('should not save after removing all the collocations', async () => {
      const { user, dataChange } = await setup({
        part: { ...createPart(), collocations: [collocation('alpha')] },
      });
      await user.click(rowButton(0, 'Delete this collocation'));
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
      await user.click(rowButton(2, 'Move this collocation up'));
      expect(dirtyChange).toHaveBeenLastCalledWith(true);
      await user.click(saveButton());
      expect(dirtyChange).toHaveBeenLastCalledWith(false);
    });

    it('should reset the collocations when the part is cleared', async () => {
      const { fixture } = await setup({ part: createPart() });
      fixture.componentRef.setInput('data', { value: null, thesauri: THESAURI });
      await fixture.whenStable();
      expect(rows()).toHaveLength(0);
    });
  });
});
