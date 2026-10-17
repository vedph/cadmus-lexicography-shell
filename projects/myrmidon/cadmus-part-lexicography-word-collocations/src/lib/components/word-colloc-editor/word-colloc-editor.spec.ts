import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { WordCollocation } from '../../lex-word-collocations-part';
import { WordCollocLiteralEditor } from '../word-colloc-literal-editor/word-colloc-literal-editor';
import { WordCollocTokenEditor } from '../word-colloc-token-editor/word-colloc-token-editor';
import { WordCollocEditor } from './word-colloc-editor';

const POS: ThesaurusEntry[] = [
  { id: 'a', value: 'adjective' },
  { id: 'n', value: 'noun' },
  { id: 'v', value: 'verb' },
];
const FEATURES: ThesaurusEntry[] = [{ id: 'sg', value: 'singular' }];
const COLL_TAGS: ThesaurusEntry[] = [
  { id: 'fixed', value: 'fixed' },
  { id: 'free', value: 'free' },
];

/** "a strong tea": ADJ+<NOUN> with connective "a". */
function createCollocation(): WordCollocation {
  return {
    tag: 'fixed',
    rank: 2,
    tokens: [{ pos: 'a', features: ['sg'], isOptional: true }, { pos: 'n', isHead: true }],
    examples: [
      { tokenNr: 0, literals: [{ value: 'a' }] },
      { tokenNr: 1, literals: [{ value: 'strong' }, { value: 'black' }] },
      { tokenNr: 2, literals: [{ value: 'tea' }] },
    ],
    note: 'a note',
  };
}

type User = ReturnType<typeof userEvent.setup>;

async function setup(inputs: Record<string, unknown> = {}) {
  stubThesaurusEntriesPicker(WordCollocTokenEditor, WordCollocLiteralEditor);
  const user = userEvent.setup();
  const collocationChange = vi.fn();
  const cancelEdit = vi.fn();
  const result = await render(WordCollocEditor, {
    inputs: { tokPosEntries: POS, ...inputs },
    on: { cancelEdit },
  });
  // collocationChange is the output of the collocation model
  result.fixture.componentInstance.collocation.subscribe(collocationChange);
  return { ...result, user, collocationChange, cancelEdit };
}

/** Get the data rows of the first table in the group with the specified name. */
function rowsIn(group: string): HTMLElement[] {
  const table = within(screen.getByRole('group', { name: group })).queryAllByRole('table')[0];
  return table ? within(table).getAllByRole('row').slice(1) : [];
}

function cellsIn(group: string): string[][] {
  return rowsIn(group).map((r) =>
    within(r)
      .getAllByRole('cell')
      .slice(1)
      .map((c) => c.textContent!.replace(/\s+/g, ' ').trim()),
  );
}

function tokenButton(index: number, description: string): HTMLElement {
  return within(rowsIn('pattern tokens')[index]).getByRole('button', { description });
}

function exampleButton(index: number, description: string): HTMLElement {
  return within(rowsIn('example tokens')[index]).getByRole('button', { description });
}

/** The collocation's accept button (the last one, after nested editors' ones). */
function acceptButton(): HTMLElement {
  return screen.getAllByRole('button', { description: 'Accept changes' }).at(-1)!;
}

/** The collocation's note (the last one, after the token editor's one if any). */
function collocationNote(): HTMLElement {
  return screen.getAllByRole('textbox', { name: 'note' }).at(-1)!;
}

async function acceptNested(user: User) {
  await user.click(screen.getAllByRole('button', { description: 'Accept changes' })[0]);
}

async function answerDialog(user: User, answer: 'yes' | 'no') {
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: answer }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('WordCollocEditor', () => {
  describe('loading', () => {
    it('should load the collocation', async () => {
      await setup({ collocation: createCollocation(), tokFeatureEntries: FEATURES });
      expect(screen.getByRole('textbox', { name: 'tag' })).toHaveValue('fixed');
      expect(screen.getByRole('spinbutton', { name: 'rank' })).toHaveValue(2);
      expect(cellsIn('pattern tokens')).toEqual([
        ['1.', 'adjective', 'singular', 'check_box'],
        ['2.', 'noun', '', 'check_box_outline_blank'],
      ]);
      expect(cellsIn('example tokens')).toEqual([
        ['0.', 'a'],
        ['1.', 'strong; black'],
        ['2.', 'tea'],
      ]);
      expect(collocationNote()).toHaveValue('a note');
    });

    it('should use a select for tags with their thesaurus', async () => {
      await setup({ collocation: createCollocation(), collTagEntries: COLL_TAGS });
      expect(await screen.findByText('fixed')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'tag' })).toHaveTextContent('fixed');
    });

    it('should not be dirty after loading', async () => {
      await setup({ collocation: createCollocation() });
      expect(acceptButton()).toBeDisabled();
    });
  });

  describe('saving', () => {
    it('should emit the edited collocation', async () => {
      const { user, collocationChange } = await setup({ collocation: createCollocation() });
      await user.clear(screen.getByRole('textbox', { name: 'tag' }));
      await user.type(screen.getByRole('textbox', { name: 'tag' }), 'free');
      await user.clear(screen.getByRole('spinbutton', { name: 'rank' }));
      await user.type(screen.getByRole('spinbutton', { name: 'rank' }), '1');
      await user.clear(collocationNote());
      await user.type(collocationNote(), ' hi ');
      await user.click(acceptButton());

      const expected = createCollocation();
      expect(collocationChange).toHaveBeenCalledExactlyOnceWith({
        ...expected,
        tag: 'free',
        rank: 1,
        note: 'hi',
      });
      expect(acceptButton()).toBeDisabled();
    });

    it('should omit empty optional values', async () => {
      const { user, collocationChange } = await setup({ collocation: createCollocation() });
      await user.clear(screen.getByRole('textbox', { name: 'tag' }));
      await user.clear(screen.getByRole('spinbutton', { name: 'rank' }));
      await user.clear(collocationNote());
      await user.click(acceptButton());
      expect(collocationChange).toHaveBeenCalledWith(
        expect.objectContaining({ tag: undefined, rank: undefined, note: undefined }),
      );
    });

    it('should clear a tag picked from its thesaurus', async () => {
      const { user, collocationChange } = await setup({
        collocation: createCollocation(),
        collTagEntries: COLL_TAGS,
      });
      await user.click(screen.getByRole('combobox', { name: 'tag' }));
      const listbox = await screen.findByRole('listbox', { name: 'tag' });
      await user.click(within(listbox).getByRole('option', { name: '(none)' }));
      await user.click(acceptButton());
      expect(collocationChange).toHaveBeenCalledWith(expect.objectContaining({ tag: undefined }));
    });

    it('should require tokens', async () => {
      const { user, collocationChange } = await setup({
        collocation: { tokens: [] },
      });
      await user.type(collocationNote(), 'x');
      expect(acceptButton()).toBeDisabled();
      expect(collocationChange).not.toHaveBeenCalled();
    });

    it('should limit the length of tag and note while typing', async () => {
      await setup({ collocation: createCollocation() });
      expect(screen.getByRole('textbox', { name: 'tag' })).toHaveAttribute('maxlength', '100');
      expect(collocationNote()).toHaveAttribute('maxlength', '1000');
    });

    it('should report too long tag and note', async () => {
      // the inputs prevent typing them, but they can come from data
      const { user } = await setup({
        collocation: { ...createCollocation(), tag: 'x'.repeat(101), note: 'x'.repeat(1001) },
      });
      await user.click(screen.getByRole('textbox', { name: 'tag' }));
      await user.tab();
      expect(screen.getByText('tag too long')).toBeInTheDocument();
      await user.click(collocationNote());
      await user.tab();
      expect(screen.getByText('note too long')).toBeInTheDocument();
      expect(acceptButton()).toBeDisabled();
    });

    it('should save on Enter in a text input once changed', async () => {
      const { user, collocationChange } = await setup({ collocation: createCollocation() });
      await user.type(screen.getByRole('textbox', { name: 'tag' }), '2{Enter}');
      expect(collocationChange).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ tag: 'fixed2' }),
      );
    });

    it('should keep the typed text when its own save comes back normalized', async () => {
      const { user, collocationChange } = await setup({ collocation: createCollocation() });
      const tag = screen.getByRole('textbox', { name: 'tag' });
      await user.type(tag, ' ');
      await user.click(acceptButton());
      expect(collocationChange).toHaveBeenCalledWith(expect.objectContaining({ tag: 'fixed' }));
      expect(tag).toHaveValue('fixed ');
      await user.type(tag, 'x');
      expect(tag).toHaveValue('fixed x');
    });

    it('should emit cancelEdit on discard', async () => {
      const { user, cancelEdit, collocationChange } = await setup({
        collocation: createCollocation(),
      });
      await user.click(screen.getAllByRole('button', { description: 'Discard changes' }).at(-1)!);
      expect(cancelEdit).toHaveBeenCalledOnce();
      expect(collocationChange).not.toHaveBeenCalled();
    });
  });

  describe('pattern tokens', () => {
    it('should add a token without saving the collocation', async () => {
      const { user, collocationChange } = await setup({ collocation: createCollocation() });
      await user.click(screen.getByRole('button', { name: 'token' }));
      expect(screen.getByText('New token')).toBeInTheDocument();
      // defaults to the first POS
      expect(screen.getByRole('button', { name: 'remove adjective' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'remove adjective' }));
      await user.click(screen.getByRole('button', { name: 'pick verb' }));
      await acceptNested(user);

      expect(cellsIn('pattern tokens').map((r) => r[1])).toEqual(['adjective', 'noun', 'verb']);
      expect(collocationChange).not.toHaveBeenCalled();
      expect(acceptButton()).toBeEnabled();
    });

    it('should add a token without POS thesaurus', async () => {
      const { user } = await setup({
        collocation: createCollocation(),
        tokPosEntries: undefined,
      });
      await user.click(screen.getByRole('button', { name: 'token' }));
      expect(screen.getByText('New token')).toBeInTheDocument();
    });

    it('should edit a token', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(tokenButton(1, 'Edit this token'));
      expect(screen.getByText('Token #2')).toBeInTheDocument();
      await user.click(screen.getByRole('checkbox', { name: 'optional' }));
      await acceptNested(user);
      expect(cellsIn('pattern tokens')[1][3]).toBe('check_box');
    });

    it('should renumber examples when moving tokens', async () => {
      const { user, collocationChange } = await setup({ collocation: createCollocation() });
      await user.click(tokenButton(1, 'Move this token up'));
      expect(cellsIn('pattern tokens').map((r) => r[1])).toEqual(['noun', 'adjective']);
      expect(cellsIn('example tokens')).toEqual([
        ['0.', 'a'],
        ['2.', 'strong; black'],
        ['1.', 'tea'],
      ]);
      await user.click(acceptButton());
      expect(collocationChange.mock.calls[0][0].examples.map((e: any) => e.tokenNr)).toEqual([
        0, 2, 1,
      ]);
    });

    it('should renumber examples when deleting a token', async () => {
      const collocation = createCollocation();
      collocation.tokens.push({ pos: 'v' });
      collocation.examples!.push({ tokenNr: 3, literals: [{ value: 'drinks' }] });
      const { user } = await setup({ collocation });
      await user.click(tokenButton(1, 'Delete this token'));
      await answerDialog(user, 'yes');
      expect(cellsIn('pattern tokens').map((r) => r[1])).toEqual(['adjective', 'verb']);
      // the deleted token's example becomes connective text
      expect(cellsIn('example tokens')).toEqual([
        ['0.', 'a'],
        ['1.', 'strong; black'],
        ['0.', 'tea'],
        ['2.', 'drinks'],
      ]);
    });

    it('should not delete a token when not confirmed', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(tokenButton(1, 'Delete this token'));
      await answerDialog(user, 'no');
      expect(rowsIn('pattern tokens')).toHaveLength(2);
    });

    it('should keep editing the right token when moving and deleting', async () => {
      const collocation = createCollocation();
      collocation.tokens.push({ pos: 'v' });
      const { user } = await setup({ collocation });
      await user.click(tokenButton(2, 'Edit this token'));
      await user.click(tokenButton(2, 'Move this token up'));
      expect(screen.getByText('Token #2')).toBeInTheDocument();
      await user.click(tokenButton(0, 'Delete this token'));
      await answerDialog(user, 'yes');
      expect(screen.getByText('Token #1')).toBeInTheDocument();
      await user.click(screen.getByRole('checkbox', { name: 'optional' }));
      await acceptNested(user);
      // the verb (now 1st) is optional, the noun (now 2nd) is unchanged
      expect(cellsIn('pattern tokens').map((r) => [r[1], r[3]])).toEqual([
        ['verb', 'check_box'],
        ['noun', 'check_box_outline_blank'],
      ]);
    });

    it('should close the token editor when deleting its token', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(tokenButton(1, 'Edit this token'));
      await user.click(tokenButton(1, 'Delete this token'));
      await answerDialog(user, 'yes');
      expect(screen.queryByRole('checkbox', { name: 'optional' })).not.toBeInTheDocument();
    });

    it('should close the token editor on discard', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(tokenButton(1, 'Edit this token'));
      await user.click(screen.getAllByRole('button', { description: 'Discard changes' })[0]);
      expect(screen.queryByRole('checkbox', { name: 'optional' })).not.toBeInTheDocument();
    });
  });

  describe('example tokens', () => {
    it('should add an example for the token after the last example one', async () => {
      const collocation = createCollocation();
      collocation.examples = collocation.examples!.slice(0, 2);
      const { user, collocationChange } = await setup({ collocation });
      await user.click(screen.getByRole('button', { name: 'example' }));
      expect(screen.getByText('New example')).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: 'token nr.' })).toHaveValue(2);

      await user.click(screen.getByRole('button', { name: 'literal' }));
      await user.type(screen.getByRole('textbox', { name: 'value' }), 'tea');
      await acceptNested(user); // literal
      await acceptNested(user); // example
      expect(cellsIn('example tokens').at(-1)).toEqual(['2.', 'tea']);
      expect(collocationChange).not.toHaveBeenCalled();
      expect(acceptButton()).toBeEnabled();
    });

    it('should not default a new example beyond the last token', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(screen.getByRole('button', { name: 'example' }));
      expect(screen.getByRole('spinbutton', { name: 'token nr.' })).toHaveValue(2);
    });

    it('should edit an example', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(exampleButton(1, 'Edit this example'));
      expect(screen.getByText('Example #2')).toBeInTheDocument();
      const nr = screen.getByRole('spinbutton', { name: 'token nr.' });
      expect(nr).toHaveValue(1);
      await user.clear(nr);
      await user.type(nr, '0');
      await acceptNested(user);
      expect(cellsIn('example tokens')[1]).toEqual(['0.', 'strong; black']);
    });

    it('should not save the collocation on Enter in an unchanged example', async () => {
      const { user, collocationChange } = await setup({ collocation: createCollocation() });
      // the collocation is changed, so Enter would save it
      await user.type(screen.getByRole('textbox', { name: 'tag' }), 'x');
      await user.click(exampleButton(1, 'Edit this example'));
      await user.type(screen.getByRole('spinbutton', { name: 'token nr.' }), '{Enter}');
      expect(collocationChange).not.toHaveBeenCalled();
      expect(screen.getByRole('spinbutton', { name: 'token nr.' })).toBeInTheDocument();
    });

    it('should save only the example on Enter in a changed example', async () => {
      const { user, collocationChange } = await setup({ collocation: createCollocation() });
      await user.click(exampleButton(1, 'Edit this example'));
      const nr = screen.getByRole('spinbutton', { name: 'token nr.' });
      await user.clear(nr);
      await user.type(nr, '2{Enter}');
      expect(cellsIn('example tokens')[1]).toEqual(['2.', 'strong; black']);
      expect(screen.queryByRole('spinbutton', { name: 'token nr.' })).not.toBeInTheDocument();
      expect(collocationChange).not.toHaveBeenCalled();
    });

    it('should render no <form> element, also with nested editors open', async () => {
      const { user, container } = await setup({ collocation: createCollocation() });
      await user.click(tokenButton(0, 'Edit this token'));
      await user.click(exampleButton(1, 'Edit this example'));
      await user.click(screen.getAllByRole('button', { description: 'Edit this literal' })[0]);
      expect(container.querySelector('form')).toBeNull();
    });

    it('should limit example token numbers to the pattern tokens', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(exampleButton(1, 'Edit this example'));
      const nr = screen.getByRole('spinbutton', { name: 'token nr.' });
      await user.clear(nr);
      await user.type(nr, '3');
      await user.tab();
      expect(screen.getByText('nr. max is 2')).toBeInTheDocument();
    });

    it('should move examples keeping the edited one', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(exampleButton(0, 'Edit this example'));
      await user.click(exampleButton(0, 'Move this example down'));
      expect(screen.getByText('Example #2')).toBeInTheDocument();
      await user.click(exampleButton(2, 'Move this example up'));
      expect(screen.getByText('Example #3')).toBeInTheDocument();
      expect(cellsIn('example tokens').map((r) => r[1])).toEqual(['strong; black', 'tea', 'a']);
      const nr = screen.getByRole('spinbutton', { name: 'token nr.' });
      await user.clear(nr);
      await user.type(nr, '1');
      await acceptNested(user);
      expect(cellsIn('example tokens')[2]).toEqual(['1.', 'a']);
    });

    it('should delete examples keeping the edited one', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(exampleButton(2, 'Edit this example'));
      await user.click(exampleButton(0, 'Delete this example'));
      await answerDialog(user, 'yes');
      expect(screen.getByText('Example #2')).toBeInTheDocument();
      const nr = screen.getByRole('spinbutton', { name: 'token nr.' });
      await user.clear(nr);
      await user.type(nr, '1');
      await acceptNested(user);
      expect(cellsIn('example tokens')).toEqual([
        ['1.', 'strong; black'],
        ['1.', 'tea'],
      ]);
    });

    it('should close the example editor when deleting its example', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(exampleButton(1, 'Edit this example'));
      await user.click(exampleButton(1, 'Delete this example'));
      await answerDialog(user, 'yes');
      expect(screen.queryByRole('spinbutton', { name: 'token nr.' })).not.toBeInTheDocument();
    });

    it('should not delete an example when not confirmed', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(exampleButton(1, 'Delete this example'));
      await answerDialog(user, 'no');
      expect(rowsIn('example tokens')).toHaveLength(3);
    });

    it('should close the example editor on discard', async () => {
      const { user } = await setup({ collocation: createCollocation() });
      await user.click(exampleButton(1, 'Edit this example'));
      await user.click(screen.getAllByRole('button', { description: 'Discard changes' })[0]);
      expect(screen.queryByRole('spinbutton', { name: 'token nr.' })).not.toBeInTheDocument();
    });
  });

  it('should reset the form when the collocation is cleared', async () => {
    const { fixture } = await setup({ collocation: createCollocation() });
    fixture.componentRef.setInput('collocation', undefined);
    await fixture.whenStable();
    expect(rowsIn('pattern tokens')).toHaveLength(0);
    expect(collocationNote()).toHaveValue('');
  });
});
