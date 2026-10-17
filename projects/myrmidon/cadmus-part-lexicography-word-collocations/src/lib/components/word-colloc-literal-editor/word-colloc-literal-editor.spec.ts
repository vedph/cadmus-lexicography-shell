import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { WordCollocationLiteral } from '../../lex-word-collocations-part';
import { WordCollocLiteralEditor } from './word-colloc-literal-editor';

const TAGS: ThesaurusEntry[] = [
  { id: 'fig', value: 'figurative' },
  { id: 'lit', value: 'literal' },
];

const LITERAL: WordCollocationLiteral = { value: 'tea', tag: 'fig', note: 'a note' };

async function setup(inputs: { literal?: WordCollocationLiteral; tagEntries?: ThesaurusEntry[] } = {}) {
  stubThesaurusEntriesPicker(WordCollocLiteralEditor);
  const user = userEvent.setup();
  const literalChange = vi.fn();
  const cancelEdit = vi.fn();
  const result = await render(WordCollocLiteralEditor, { inputs, on: { cancelEdit } });
  // literalChange is the output of the literal model
  result.fixture.componentInstance.literal.subscribe(literalChange);
  return { ...result, user, literalChange, cancelEdit };
}

function acceptButton(): HTMLElement {
  return screen.getByRole('button', { description: 'Accept changes' });
}

describe('WordCollocLiteralEditor', () => {
  describe('with tags thesaurus', () => {
    it('should load the literal', async () => {
      await setup({ literal: LITERAL, tagEntries: TAGS });
      expect(screen.getByRole('textbox', { name: 'value' })).toHaveValue('tea');
      expect(screen.getByRole('button', { name: 'remove figurative' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue('a note');
      expect(screen.queryByRole('textbox', { name: 'tag' })).not.toBeInTheDocument();
    });

    it('should emit the edited literal', async () => {
      const { user, literalChange } = await setup({ literal: LITERAL, tagEntries: TAGS });
      await user.clear(screen.getByRole('textbox', { name: 'value' }));
      await user.type(screen.getByRole('textbox', { name: 'value' }), ' coffee ');
      await user.click(screen.getByRole('button', { name: 'remove figurative' }));
      await user.click(screen.getByRole('button', { name: 'pick literal' }));
      await user.clear(screen.getByRole('textbox', { name: 'note' }));
      await user.click(acceptButton());
      expect(literalChange).toHaveBeenCalledExactlyOnceWith({
        value: 'coffee',
        tag: 'lit',
        note: undefined,
      });
      expect(acceptButton()).toBeDisabled();
    });

    it('should allow removing the tag', async () => {
      const { user, literalChange } = await setup({ literal: LITERAL, tagEntries: TAGS });
      await user.click(screen.getByRole('button', { name: 'remove figurative' }));
      await user.click(acceptButton());
      expect(literalChange).toHaveBeenCalledWith(expect.objectContaining({ tag: undefined }));
    });
  });

  describe('without tags thesaurus', () => {
    it('should show the tag as text', async () => {
      await setup({ literal: LITERAL });
      expect(screen.getByRole('textbox', { name: 'tag' })).toHaveValue('fig');
    });

    it('should save a typed tag', async () => {
      const { user, literalChange } = await setup({ literal: { value: 'tea' } });
      await user.type(screen.getByRole('textbox', { name: 'tag' }), ' fig ');
      await user.click(acceptButton());
      expect(literalChange).toHaveBeenCalledExactlyOnceWith({
        value: 'tea',
        tag: 'fig',
        note: undefined,
      });
    });

    it('should report a too long tag', async () => {
      const { user } = await setup({ literal: LITERAL });
      const tag = screen.getByRole('textbox', { name: 'tag' });
      await user.clear(tag);
      await user.click(tag);
      await user.paste('x'.repeat(51));
      await user.tab();
      expect(screen.getByText('tag too long')).toBeInTheDocument();
      expect(acceptButton()).toBeDisabled();
    });
  });

  describe('validation', () => {
    it('should require a value', async () => {
      const { user, literalChange } = await setup({ literal: LITERAL });
      await user.clear(screen.getByRole('textbox', { name: 'value' }));
      await user.tab();
      expect(screen.getByText('value required')).toBeInTheDocument();
      expect(acceptButton()).toBeDisabled();
      await user.type(screen.getByRole('textbox', { name: 'value' }), '{Enter}');
      expect(literalChange).not.toHaveBeenCalled();
    });

    it('should report too long value and note', async () => {
      const { user } = await setup({ literal: LITERAL });
      const paste = async (name: string, length: number) => {
        const input = screen.getByRole('textbox', { name });
        await user.clear(input);
        await user.click(input);
        await user.paste('x'.repeat(length));
        await user.tab();
      };
      await paste('value', 101);
      expect(screen.getByText('value too long')).toBeInTheDocument();
      await paste('note', 1001);
      expect(screen.getByText('note too long')).toBeInTheDocument();
    });
  });

  it('should emit cancelEdit on discard', async () => {
    const { user, cancelEdit } = await setup({ literal: LITERAL });
    await user.click(screen.getByRole('button', { description: 'Discard changes' }));
    expect(cancelEdit).toHaveBeenCalledOnce();
  });

  it('should reset the form when the literal is cleared', async () => {
    const { fixture } = await setup({ literal: LITERAL });
    fixture.componentRef.setInput('literal', undefined);
    await fixture.whenStable();
    expect(screen.getByRole('textbox', { name: 'value' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'tag' })).toHaveValue('');
  });
});
