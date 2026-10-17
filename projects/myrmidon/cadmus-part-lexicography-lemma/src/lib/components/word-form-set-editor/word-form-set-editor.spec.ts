import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { WordForm } from '../../lex-lemma-part';
import { WordFormEditor } from '../word-form-editor/word-form-editor';
import { WordFormSetEditor } from './word-form-set-editor';

const POS: ThesaurusEntry[] = [
  { id: 'n', value: 'noun' },
  { id: 'v', value: 'verb' },
];
const TYPES: ThesaurusEntry[] = [
  { id: 'lemma', value: 'lemma form' },
  { id: 'var', value: 'variant form' },
];
const PREFIXES: ThesaurusEntry[] = [{ id: 'ri', value: 'ri-' }];
const SUFFIXES: ThesaurusEntry[] = [{ id: 'ino', value: '-ino' }];

const FORMS: WordForm[] = [
  { type: 'lemma', value: 'alpha', pos: 'n' },
  { type: 'lemma', value: 'beta', pos: 'n' },
  { type: 'lemma', value: 'gamma', pos: 'v' },
];

async function setup(inputs: Record<string, unknown> = {}) {
  stubThesaurusEntriesPicker(WordFormEditor);
  const formsChange = vi.fn();
  const user = userEvent.setup();
  const result = await render(WordFormSetEditor, {
    inputs: { posEntries: POS, ...inputs },
  });
  // formsChange is the output of the forms model
  result.fixture.componentInstance.forms.subscribe(formsChange);
  return { ...result, user, formsChange };
}

/** Get the data rows (header excluded). */
function rows(): HTMLElement[] {
  return screen.queryAllByRole('row').slice(1);
}

/** Get the values listed in the table, in their order. */
function listedValues(): string[] {
  return rows().map((r) => within(r).getAllByRole('cell')[3].textContent!.trim());
}

function rowButton(index: number, description: string): HTMLElement {
  return within(rows()[index]).getByRole('button', { description });
}

function acceptButton(): HTMLElement {
  return screen.getByRole('button', { description: 'Accept changes' });
}

/** Answer the confirmation dialog and wait for it to close. */
async function answerDialog(user: ReturnType<typeof userEvent.setup>, answer: 'yes' | 'no') {
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: answer }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

async function setValue(user: ReturnType<typeof userEvent.setup>, value: string) {
  const input = screen.getByRole('textbox', { name: 'value' });
  await user.clear(input);
  await user.type(input, value);
}

describe('WordFormSetEditor', () => {
  describe('list', () => {
    it('should show no table without forms', async () => {
      await setup();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'value' })).not.toBeInTheDocument();
    });

    it('should list forms with thesauri labels', async () => {
      await setup({
        forms: [{ type: 'var', prefix: 'ri', value: 'cane', suffix: 'ino', pos: 'v' }],
        typeEntries: TYPES,
        prefixEntries: PREFIXES,
        suffixEntries: SUFFIXES,
      });
      const cells = within(rows()[0])
        .getAllByRole('cell')
        .map((c) => c.textContent!.trim());
      expect(cells.slice(1)).toEqual(['variant form', 'ri-', 'cane', '-ino', 'verb']);
    });

    it('should list raw IDs without thesauri', async () => {
      await setup({
        forms: [{ type: 'var', prefix: 'ri', value: 'cane', pos: 'x' }],
      });
      const cells = within(rows()[0])
        .getAllByRole('cell')
        .map((c) => c.textContent!.trim());
      expect(cells.slice(1)).toEqual(['var', 'ri', 'cane', '', 'x']);
    });
  });

  describe('adding', () => {
    it('should add a new form with defaults from thesauri', async () => {
      const { user, formsChange } = await setup({ typeEntries: TYPES });
      await user.click(screen.getByRole('button', { name: 'form' }));

      expect(screen.getByText('new form')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'type' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'remove noun' })).toBeInTheDocument();

      await setValue(user, 'cane');
      await user.click(acceptButton());

      expect(formsChange).toHaveBeenCalledExactlyOnceWith([
        expect.objectContaining({ type: 'lemma', value: 'cane', pos: 'n' }),
      ]);
      expect(listedValues()).toEqual(['cane']);
      // editor closed
      expect(screen.queryByRole('textbox', { name: 'value' })).not.toBeInTheDocument();
    });

    it('should append a new form to existing ones', async () => {
      const { user } = await setup({ forms: FORMS });
      await user.click(screen.getByRole('button', { name: 'form' }));
      await user.type(screen.getByRole('textbox', { name: 'type' }), 'lemma');
      await setValue(user, 'delta');
      await user.click(acceptButton());
      expect(listedValues()).toEqual(['alpha', 'beta', 'gamma', 'delta']);
    });
  });

  describe('editing', () => {
    it('should edit an existing form', async () => {
      const { user, formsChange } = await setup({ forms: FORMS });
      await user.click(rowButton(1, 'Edit this form'));

      expect(screen.getByText('form #2')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'value' })).toHaveValue('beta');

      await setValue(user, 'BETA');
      await user.click(acceptButton());

      expect(listedValues()).toEqual(['alpha', 'BETA', 'gamma']);
      expect(formsChange).toHaveBeenCalledOnce();
      expect(screen.queryByRole('textbox', { name: 'value' })).not.toBeInTheDocument();
    });

    it('should not change the original forms while editing', async () => {
      const forms = structuredClone(FORMS);
      const { user } = await setup({ forms });
      await user.click(rowButton(0, 'Edit this form'));
      await setValue(user, 'changed');
      expect(forms[0].value).toBe('alpha');
    });

    it('should discard changes', async () => {
      const { user, formsChange } = await setup({ forms: FORMS });
      await user.click(rowButton(0, 'Edit this form'));
      await setValue(user, 'changed');
      await user.click(screen.getByRole('button', { description: 'Discard changes' }));

      expect(screen.queryByRole('textbox', { name: 'value' })).not.toBeInTheDocument();
      expect(listedValues()).toEqual(['alpha', 'beta', 'gamma']);
      expect(formsChange).not.toHaveBeenCalled();
    });
  });

  describe('moving', () => {
    it('should disable moving the first form up and the last down', async () => {
      await setup({ forms: FORMS });
      expect(rowButton(0, 'Move this form up')).toBeDisabled();
      expect(rowButton(0, 'Move this form down')).toBeEnabled();
      expect(rowButton(2, 'Move this form up')).toBeEnabled();
      expect(rowButton(2, 'Move this form down')).toBeDisabled();
    });

    it('should move forms up and down', async () => {
      const { user, formsChange } = await setup({ forms: FORMS });
      await user.click(rowButton(2, 'Move this form up'));
      expect(listedValues()).toEqual(['alpha', 'gamma', 'beta']);

      await user.click(rowButton(0, 'Move this form down'));
      expect(listedValues()).toEqual(['gamma', 'alpha', 'beta']);
      expect(formsChange).toHaveBeenCalledTimes(2);
    });

    it('should save the edited form in its new position after moving it', async () => {
      const { user } = await setup({ forms: FORMS });
      await user.click(rowButton(0, 'Edit this form'));
      await user.click(rowButton(0, 'Move this form down'));
      expect(screen.getByText('form #2')).toBeInTheDocument();

      await setValue(user, 'ALPHA');
      await user.click(acceptButton());
      expect(listedValues()).toEqual(['beta', 'ALPHA', 'gamma']);
    });

    it('should save the edited form in its new position after moving its neighbor', async () => {
      const { user } = await setup({ forms: FORMS });
      await user.click(rowButton(1, 'Edit this form'));
      await user.click(rowButton(2, 'Move this form up'));
      expect(screen.getByText('form #3')).toBeInTheDocument();

      await setValue(user, 'BETA');
      await user.click(acceptButton());
      expect(listedValues()).toEqual(['alpha', 'gamma', 'BETA']);
    });
  });

  describe('deleting', () => {
    it('should delete a form after confirmation', async () => {
      const { user, formsChange } = await setup({ forms: FORMS });
      await user.click(rowButton(1, 'Delete this form'));
      expect(await screen.findByText('Delete form #2?')).toBeInTheDocument();
      await answerDialog(user, 'yes');

      expect(listedValues()).toEqual(['alpha', 'gamma']);
      expect(formsChange).toHaveBeenCalledOnce();
    });

    it('should not delete a form when not confirmed', async () => {
      const { user, formsChange } = await setup({ forms: FORMS });
      await user.click(rowButton(1, 'Delete this form'));
      await answerDialog(user, 'no');

      expect(listedValues()).toEqual(['alpha', 'beta', 'gamma']);
      expect(formsChange).not.toHaveBeenCalled();
    });

    it('should close the editor when deleting the edited form', async () => {
      const { user } = await setup({ forms: FORMS });
      await user.click(rowButton(1, 'Edit this form'));
      await user.click(rowButton(1, 'Delete this form'));
      await answerDialog(user, 'yes');
      expect(screen.queryByRole('textbox', { name: 'value' })).not.toBeInTheDocument();
    });

    it('should save the edited form in its place after deleting a form before it', async () => {
      const { user } = await setup({ forms: FORMS });
      await user.click(rowButton(2, 'Edit this form'));
      await user.click(rowButton(0, 'Delete this form'));
      await answerDialog(user, 'yes');
      expect(screen.getByText('form #2')).toBeInTheDocument();

      await setValue(user, 'GAMMA');
      await user.click(acceptButton());
      expect(listedValues()).toEqual(['beta', 'GAMMA']);
    });
  });
});
