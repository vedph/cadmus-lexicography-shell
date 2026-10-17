import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { WordCollocationToken } from '../../lex-word-collocations-part';
import { WordCollocTokenEditor } from './word-colloc-token-editor';

const POS: ThesaurusEntry[] = [
  { id: 'n', value: 'noun' },
  { id: 'a', value: 'adjective' },
];
const FEATURES: ThesaurusEntry[] = [
  { id: 'sg', value: 'singular' },
  { id: 'pl', value: 'plural' },
];

const TOKEN: WordCollocationToken = {
  pos: 'n',
  features: ['sg'],
  isHead: true,
  isOptional: false,
  note: 'a note',
};

interface SetupOptions {
  token?: WordCollocationToken;
  posEntries?: ThesaurusEntry[] | undefined;
  featureEntries?: ThesaurusEntry[];
  realPicker?: boolean;
}

async function setup(options: SetupOptions = {}) {
  if (!options.realPicker) {
    stubThesaurusEntriesPicker(WordCollocTokenEditor);
  }
  const user = userEvent.setup();
  const tokenChange = vi.fn();
  const cancelEdit = vi.fn();
  const { realPicker, ...inputs } = options;
  const result = await render(WordCollocTokenEditor, {
    inputs: { posEntries: POS, ...inputs },
    on: { cancelEdit },
  });
  // tokenChange is the output of the token model
  result.fixture.componentInstance.token.subscribe(tokenChange);
  return { ...result, user, tokenChange, cancelEdit };
}

function acceptButton(): HTMLElement {
  return screen.getByRole('button', { description: 'Accept changes' });
}

describe('WordCollocTokenEditor', () => {
  it('should load the token', async () => {
    await setup({ token: TOKEN, featureEntries: FEATURES });
    expect(screen.getByRole('button', { name: 'remove noun' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'head' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'optional' })).not.toBeChecked();
    const features = screen.getByRole('group', { name: 'features' });
    expect(within(features).getByRole('button', { name: 'remove singular' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue('a note');
  });

  it('should show features only with their thesaurus', async () => {
    await setup({ token: TOKEN });
    expect(screen.queryByRole('group', { name: 'features' })).not.toBeInTheDocument();
  });

  it('should default POS to the first entry when missing', async () => {
    await setup({ token: { pos: '' } });
    expect(screen.getByRole('button', { name: 'remove noun' })).toBeInTheDocument();
  });

  it('should show a raw POS ID without thesaurus', async () => {
    await setup({ token: { pos: 'x' }, posEntries: undefined });
    expect(screen.getByRole('button', { name: 'remove x' })).toBeInTheDocument();
  });

  it('should emit the edited token', async () => {
    const { user, tokenChange } = await setup({ token: TOKEN, featureEntries: FEATURES });
    await user.click(screen.getByRole('button', { name: 'remove noun' }));
    await user.click(screen.getByRole('button', { name: 'pick adjective' }));
    await user.click(screen.getByRole('button', { name: 'pick plural' }));
    await user.click(screen.getByRole('checkbox', { name: 'head' }));
    await user.click(screen.getByRole('checkbox', { name: 'optional' }));
    await user.clear(screen.getByRole('textbox', { name: 'note' }));
    await user.type(screen.getByRole('textbox', { name: 'note' }), ' hi ');
    await user.click(acceptButton());

    expect(tokenChange).toHaveBeenCalledExactlyOnceWith({
      pos: 'a',
      features: ['sg', 'pl'],
      isHead: false,
      isOptional: true,
      note: 'hi',
    });
    expect(acceptButton()).toBeDisabled();
  });

  it('should require a POS', async () => {
    const { user, tokenChange } = await setup({ token: TOKEN });
    await user.click(screen.getByRole('checkbox', { name: 'optional' }));
    await user.click(screen.getByRole('button', { name: 'remove noun' }));
    expect(acceptButton()).toBeDisabled();
    expect(tokenChange).not.toHaveBeenCalled();
  });

  it('should report a too long note', async () => {
    const { user } = await setup({ token: TOKEN });
    const note = screen.getByRole('textbox', { name: 'note' });
    await user.clear(note);
    await user.click(note);
    await user.paste('x'.repeat(1001));
    await user.tab();
    expect(screen.getByText('note too long')).toBeInTheDocument();
    expect(acceptButton()).toBeDisabled();
  });

  it('should emit cancelEdit on discard', async () => {
    const { user, cancelEdit } = await setup({ token: TOKEN });
    await user.click(screen.getByRole('button', { description: 'Discard changes' }));
    expect(cancelEdit).toHaveBeenCalledOnce();
  });

  it('should reset the form when the token is cleared', async () => {
    const { fixture } = await setup({ token: TOKEN });
    fixture.componentRef.setInput('token', undefined);
    await fixture.whenStable();
    expect(screen.getByRole('checkbox', { name: 'head' })).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue('');
  });

  it('should not break when the POS entry is removed from the real picker', async () => {
    // the real picker's tree store is chatty
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { user } = await setup({ token: TOKEN, realPicker: true });
    await user.click(screen.getByRole('button', { name: 'Remove entry' }));
    expect(screen.queryByRole('option', { name: /noun/ })).not.toBeInTheDocument();
    expect(acceptButton()).toBeDisabled();
  });
});
