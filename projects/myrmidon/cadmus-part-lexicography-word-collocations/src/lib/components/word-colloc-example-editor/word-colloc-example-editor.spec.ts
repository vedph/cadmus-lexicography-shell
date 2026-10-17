import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { WordCollocationExampleToken } from '../../lex-word-collocations-part';
import { WordCollocLiteralEditor } from '../word-colloc-literal-editor/word-colloc-literal-editor';
import { WordCollocExampleEditor } from './word-colloc-example-editor';

const TAGS: ThesaurusEntry[] = [{ id: 'fig', value: 'figurative' }];

function createExample(): WordCollocationExampleToken {
  return {
    tokenNr: 2,
    literals: [{ value: 'alpha', tag: 'fig' }, { value: 'beta' }, { value: 'gamma' }],
  };
}

type User = ReturnType<typeof userEvent.setup>;

async function setup(inputs: Record<string, unknown> = {}) {
  stubThesaurusEntriesPicker(WordCollocLiteralEditor);
  const user = userEvent.setup();
  const exampleChange = vi.fn();
  const cancelEdit = vi.fn();
  const result = await render(WordCollocExampleEditor, {
    inputs: { maxTokenNr: 3, ...inputs },
    on: { cancelEdit },
  });
  // exampleChange is the output of the example model
  result.fixture.componentInstance.example.subscribe(exampleChange);
  return { ...result, user, exampleChange, cancelEdit };
}

function tokenNr(): HTMLElement {
  return screen.getByRole('spinbutton', { name: 'token nr.' });
}

/** The example's accept button (the last one, after the literal editor's one if any). */
function acceptButton(): HTMLElement {
  return screen.getAllByRole('button', { description: 'Accept changes' }).at(-1)!;
}

function rows(): HTMLElement[] {
  return screen.queryAllByRole('row').slice(1);
}

function listedValues(): string[] {
  return rows().map((r) => within(r).getAllByRole('cell')[2].textContent!.trim());
}

function rowButton(index: number, description: string): HTMLElement {
  return within(rows()[index]).getByRole('button', { description });
}

function literalValue(): HTMLElement {
  return screen.getByRole('textbox', { name: 'value' });
}

async function setLiteralValue(user: User, value: string) {
  await user.clear(literalValue());
  await user.type(literalValue(), value);
}

async function acceptLiteral(user: User) {
  await user.click(screen.getAllByRole('button', { description: 'Accept changes' })[0]);
}

async function answerDialog(user: User, answer: 'yes' | 'no') {
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: answer }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('WordCollocExampleEditor', () => {
  describe('loading', () => {
    it('should load the example', async () => {
      await setup({ example: createExample(), tagEntries: TAGS });
      expect(tokenNr()).toHaveValue(2);
      const cells = rows().map((r) =>
        within(r)
          .getAllByRole('cell')
          .slice(1)
          .map((c) => c.textContent!.trim()),
      );
      expect(cells).toEqual([
        ['1.', 'alpha', 'figurative'],
        ['2.', 'beta', ''],
        ['3.', 'gamma', ''],
      ]);
    });

    it('should not be dirty after loading', async () => {
      await setup({ example: createExample() });
      expect(acceptButton()).toBeDisabled();
    });

    it('should update when the example changes', async () => {
      const { fixture, user } = await setup({ example: createExample() });
      await user.click(rowButton(0, 'Edit this literal'));
      fixture.componentRef.setInput('example', { tokenNr: 0, literals: [{ value: 'x' }] });
      await fixture.whenStable();
      expect(tokenNr()).toHaveValue(0);
      expect(listedValues()).toEqual(['x']);
      expect(screen.queryByRole('textbox', { name: 'value' })).not.toBeInTheDocument();
      expect(acceptButton()).toBeDisabled();
    });
  });

  describe('token number', () => {
    it('should save a changed token number', async () => {
      const { user, exampleChange } = await setup({ example: createExample() });
      await user.clear(tokenNr());
      await user.type(tokenNr(), '3');
      await user.click(acceptButton());
      expect(exampleChange).toHaveBeenCalledExactlyOnceWith({
        tokenNr: 3,
        literals: createExample().literals,
      });
      expect(acceptButton()).toBeDisabled();
    });

    it('should allow 0 for connective text', async () => {
      const { user, exampleChange } = await setup({ example: createExample() });
      await user.clear(tokenNr());
      await user.type(tokenNr(), '0');
      await user.click(acceptButton());
      expect(exampleChange).toHaveBeenCalledWith(expect.objectContaining({ tokenNr: 0 }));
    });

    it('should not allow numbers beyond the pattern tokens', async () => {
      const { user, exampleChange } = await setup({ example: createExample() });
      await user.clear(tokenNr());
      await user.type(tokenNr(), '4');
      await user.tab();
      expect(screen.getByText('nr. max is 3')).toBeInTheDocument();
      await user.click(acceptButton());
      expect(exampleChange).not.toHaveBeenCalled();
    });

    it('should not allow negative numbers', async () => {
      const { user, exampleChange } = await setup({ example: createExample() });
      await user.clear(tokenNr());
      await user.type(tokenNr(), '-1');
      await user.tab();
      expect(screen.getByText('nr. min is 0')).toBeInTheDocument();
      await user.click(acceptButton());
      expect(exampleChange).not.toHaveBeenCalled();
    });

    it('should not submit an enclosing form on Enter', async () => {
      stubThesaurusEntriesPicker(WordCollocLiteralEditor);
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      await render(
        `<form (submit)="onSubmit(); $event.preventDefault()">
          <cadmus-word-colloc-example-editor [example]="example" [maxTokenNr]="3" />
        </form>`,
        {
          imports: [WordCollocExampleEditor],
          componentProperties: { onSubmit, example: createExample() },
        },
      );
      await user.type(tokenNr(), '{Backspace}1{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('literals', () => {
    it('should require literals', async () => {
      const { user } = await setup({ example: { tokenNr: 1, literals: [] } });
      await user.clear(tokenNr());
      await user.type(tokenNr(), '2');
      expect(acceptButton()).toBeDisabled();
    });

    it('should add a literal', async () => {
      const { user, exampleChange } = await setup({ example: createExample() });
      await user.click(screen.getByRole('button', { name: 'literal' }));
      expect(screen.getByText('New literal')).toBeInTheDocument();
      await setLiteralValue(user, 'delta');
      await acceptLiteral(user);
      expect(listedValues()).toEqual(['alpha', 'beta', 'gamma', 'delta']);
      expect(exampleChange).not.toHaveBeenCalled();

      await user.click(acceptButton());
      expect(exampleChange).toHaveBeenCalledExactlyOnceWith({
        tokenNr: 2,
        literals: [...createExample().literals, expect.objectContaining({ value: 'delta' })],
      });
    });

    it('should edit a literal', async () => {
      const { user } = await setup({ example: createExample() });
      await user.click(rowButton(1, 'Edit this literal'));
      expect(screen.getByText('Literal #2')).toBeInTheDocument();
      expect(literalValue()).toHaveValue('beta');
      await setLiteralValue(user, 'BETA');
      await acceptLiteral(user);
      expect(listedValues()).toEqual(['alpha', 'BETA', 'gamma']);
      expect(acceptButton()).toBeEnabled();
    });

    it('should only close the literal editor when discarding literal changes', async () => {
      const { user, cancelEdit } = await setup({ example: createExample() });
      await user.click(rowButton(1, 'Edit this literal'));
      await setLiteralValue(user, 'BETA');
      await user.click(screen.getAllByRole('button', { description: 'Discard changes' })[0]);
      expect(screen.queryByRole('textbox', { name: 'value' })).not.toBeInTheDocument();
      expect(listedValues()).toEqual(['alpha', 'beta', 'gamma']);
      expect(cancelEdit).not.toHaveBeenCalled();
    });

    it('should move literals', async () => {
      const { user } = await setup({ example: createExample() });
      expect(rowButton(0, 'Move this literal up')).toBeDisabled();
      expect(rowButton(2, 'Move this literal down')).toBeDisabled();
      await user.click(rowButton(2, 'Move this literal up'));
      expect(listedValues()).toEqual(['alpha', 'gamma', 'beta']);
      await user.click(rowButton(0, 'Move this literal down'));
      expect(listedValues()).toEqual(['gamma', 'alpha', 'beta']);
      expect(acceptButton()).toBeEnabled();
    });

    it('should save the edited literal in its new position after moving', async () => {
      const { user } = await setup({ example: createExample() });
      await user.click(rowButton(0, 'Edit this literal'));
      await user.click(rowButton(0, 'Move this literal down'));
      expect(screen.getByText('Literal #2')).toBeInTheDocument();
      await user.click(rowButton(2, 'Move this literal up'));
      expect(screen.getByText('Literal #3')).toBeInTheDocument();
      await setLiteralValue(user, 'ALPHA');
      await acceptLiteral(user);
      expect(listedValues()).toEqual(['beta', 'gamma', 'ALPHA']);
    });

    it('should delete a literal after confirmation', async () => {
      const { user } = await setup({ example: createExample() });
      await user.click(rowButton(1, 'Delete this literal'));
      await answerDialog(user, 'yes');
      expect(listedValues()).toEqual(['alpha', 'gamma']);
      expect(acceptButton()).toBeEnabled();
    });

    it('should not delete a literal when not confirmed', async () => {
      const { user } = await setup({ example: createExample() });
      await user.click(rowButton(1, 'Delete this literal'));
      await answerDialog(user, 'no');
      expect(listedValues()).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should close the literal editor when deleting its literal', async () => {
      const { user } = await setup({ example: createExample() });
      await user.click(rowButton(1, 'Edit this literal'));
      await user.click(rowButton(1, 'Delete this literal'));
      await answerDialog(user, 'yes');
      expect(screen.queryByRole('textbox', { name: 'value' })).not.toBeInTheDocument();
    });

    it('should save the edited literal in its place after deleting one before it', async () => {
      const { user } = await setup({ example: createExample() });
      await user.click(rowButton(2, 'Edit this literal'));
      await user.click(rowButton(0, 'Delete this literal'));
      await answerDialog(user, 'yes');
      expect(screen.getByText('Literal #2')).toBeInTheDocument();
      await setLiteralValue(user, 'GAMMA');
      await acceptLiteral(user);
      expect(listedValues()).toEqual(['beta', 'GAMMA']);
    });
  });

  it('should emit cancelEdit on discard', async () => {
    const { user, cancelEdit, exampleChange } = await setup({ example: createExample() });
    await user.click(screen.getByRole('button', { description: 'Discard changes' }));
    expect(cancelEdit).toHaveBeenCalledOnce();
    expect(exampleChange).not.toHaveBeenCalled();
  });
});
