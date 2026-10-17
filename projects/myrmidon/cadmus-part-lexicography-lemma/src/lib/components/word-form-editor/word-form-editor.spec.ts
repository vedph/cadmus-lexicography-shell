import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { WordForm } from '../../lex-lemma-part';
import { WordFormEditor } from './word-form-editor';

const POS: ThesaurusEntry[] = [
  { id: 'n', value: 'noun' },
  { id: 'v', value: 'verb' },
];
const TYPES: ThesaurusEntry[] = [
  { id: 'lemma', value: 'lemma form' },
  { id: 'var', value: 'variant form' },
];
const PREFIXES: ThesaurusEntry[] = [
  { id: 'ri', value: 'ri-' },
  { id: 's', value: 's-' },
];
const SUFFIXES: ThesaurusEntry[] = [
  { id: 'ino', value: '-ino' },
  { id: 'one', value: '-one' },
];
const FEATURES: ThesaurusEntry[] = [
  { id: 'm', value: 'masculine' },
  { id: 'f', value: 'feminine' },
];
const TAGS: ThesaurusEntry[] = [
  { id: 'rare', value: 'rare' },
  { id: 'old', value: 'archaic' },
];

const FORM: WordForm = {
  type: 'lemma',
  value: 'cane',
  pos: 'n',
};

interface SetupOptions {
  form?: WordForm;
  typeEntries?: ThesaurusEntry[];
  prefixEntries?: ThesaurusEntry[];
  suffixEntries?: ThesaurusEntry[];
  posEntries?: ThesaurusEntry[];
  featureEntries?: ThesaurusEntry[];
  tagEntries?: ThesaurusEntry[];
  realPicker?: boolean;
}

async function setup(options: SetupOptions = {}) {
  if (!options.realPicker) {
    stubThesaurusEntriesPicker(WordFormEditor);
  }
  const formChange = vi.fn();
  const cancelEdit = vi.fn();
  const user = userEvent.setup();
  const { realPicker, ...inputs } = options;
  const result = await render(WordFormEditor, {
    inputs: { posEntries: POS, ...inputs },
    on: { cancelEdit },
  });
  // formChange is the output of the form model
  result.fixture.componentInstance.form.subscribe(formChange);
  return { ...result, user, formChange, cancelEdit };
}

function acceptButton(): HTMLElement {
  return screen.getByRole('button', { description: 'Accept changes' });
}

async function pickOption(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  const listbox = await screen.findByRole('listbox', { name: label });
  await user.click(within(listbox).getByRole('option', { name: option }));
}

describe('WordFormEditor', () => {
  describe('rendering', () => {
    it('should use free text inputs for type, prefix and suffix without thesauri', async () => {
      await setup({ form: FORM });
      expect(screen.getByRole('textbox', { name: 'type' })).toHaveValue('lemma');
      expect(screen.getByRole('textbox', { name: 'prefix' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'suffix' })).toHaveValue('');
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should use selects for type, prefix and suffix with thesauri', async () => {
      await setup({
        form: { ...FORM, prefix: 'ri', suffix: 'ino' },
        typeEntries: TYPES,
        prefixEntries: PREFIXES,
        suffixEntries: SUFFIXES,
      });
      expect(await screen.findByText('lemma form')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'type' })).toHaveTextContent('lemma form');
      expect(screen.getByRole('combobox', { name: 'prefix' })).toHaveTextContent('ri-');
      expect(screen.getByRole('combobox', { name: 'suffix' })).toHaveTextContent('-ino');
    });

    it('should load the form data', async () => {
      await setup({
        form: {
          type: 'lemma',
          prefix: 'ri',
          value: 'cane',
          suffix: 'ino',
          pos: 'n',
          features: ['m'],
          tags: ['rare'],
          note: 'a note',
        },
        featureEntries: FEATURES,
        tagEntries: TAGS,
      });
      expect(screen.getByRole('textbox', { name: 'prefix' })).toHaveValue('ri');
      expect(screen.getByRole('textbox', { name: 'value' })).toHaveValue('cane');
      expect(screen.getByRole('textbox', { name: 'suffix' })).toHaveValue('ino');
      expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue('a note');
      expect(screen.getByRole('button', { name: 'remove noun' })).toBeInTheDocument();
      const features = screen.getByRole('group', { name: 'features' });
      expect(within(features).getByRole('button', { name: 'remove masculine' })).toBeInTheDocument();
      const tags = screen.getByRole('group', { name: 'tags' });
      expect(within(tags).getByRole('button', { name: 'remove rare' })).toBeInTheDocument();
    });

    it('should show features and tags only when their thesauri are set', async () => {
      await setup({ form: FORM });
      expect(screen.queryByRole('group', { name: 'features' })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'tags' })).not.toBeInTheDocument();
    });

    it('should show raw IDs for features and tags not found in thesauri', async () => {
      await setup({
        form: { ...FORM, features: ['x'], tags: ['y'] },
        featureEntries: FEATURES,
        tagEntries: TAGS,
      });
      expect(screen.getByRole('button', { name: 'remove x' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'remove y' })).toBeInTheDocument();
    });

    it('should show a raw POS ID not found in thesaurus', async () => {
      await setup({ form: { ...FORM, pos: 'adj' } });
      expect(screen.getByRole('button', { name: 'remove adj' })).toBeInTheDocument();
    });

    it('should default POS to the first POS entry when the form has none', async () => {
      const { user, formChange } = await setup({ form: { ...FORM, pos: '' } });
      expect(screen.getByRole('button', { name: 'remove noun' })).toBeInTheDocument();

      await user.type(screen.getByRole('textbox', { name: 'value' }), 's');
      await user.click(acceptButton());
      expect(formChange).toHaveBeenCalledWith(expect.objectContaining({ pos: 'n' }));
    });

    it('should have empty fields without a form', async () => {
      await setup();
      expect(screen.getByRole('textbox', { name: 'type' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'value' })).toHaveValue('');
      // no POS picked, rather than an empty POS entry
      expect(within(screen.getByRole('list', { name: 'picked entries' })).queryAllByRole('listitem'))
        .toHaveLength(0);
    });

    it('should reset the fields when the form is cleared', async () => {
      const { fixture } = await setup({ form: FORM });
      fixture.componentRef.setInput('form', undefined);
      await fixture.whenStable();
      expect(screen.getByRole('textbox', { name: 'value' })).toHaveValue('');
    });
  });

  describe('saving', () => {
    it('should disable accept while pristine', async () => {
      await setup({ form: FORM });
      expect(acceptButton()).toBeDisabled();
    });

    it('should emit the edited form on accept', async () => {
      const { user, formChange } = await setup({
        form: FORM,
        featureEntries: FEATURES,
        tagEntries: TAGS,
      });
      await user.type(screen.getByRole('textbox', { name: 'prefix' }), 'ri');
      await user.clear(screen.getByRole('textbox', { name: 'value' }));
      await user.type(screen.getByRole('textbox', { name: 'value' }), 'gatto');
      await user.type(screen.getByRole('textbox', { name: 'suffix' }), 'ino');
      await user.click(screen.getByRole('button', { name: 'pick feminine' }));
      await user.click(screen.getByRole('button', { name: 'pick archaic' }));
      await user.type(screen.getByRole('textbox', { name: 'note' }), '  hello  ');

      expect(acceptButton()).toBeEnabled();
      await user.click(acceptButton());

      expect(formChange).toHaveBeenCalledExactlyOnceWith({
        type: 'lemma',
        prefix: 'ri',
        value: 'gatto',
        suffix: 'ino',
        pos: 'n',
        features: ['f'],
        tags: ['old'],
        note: 'hello',
      });
      // pristine again after saving
      expect(acceptButton()).toBeDisabled();
    });

    it('should omit empty optional values', async () => {
      const { user, formChange } = await setup({
        form: { ...FORM, prefix: 'ri', suffix: 'ino', note: 'x' },
      });
      await user.clear(screen.getByRole('textbox', { name: 'prefix' }));
      await user.clear(screen.getByRole('textbox', { name: 'suffix' }));
      await user.clear(screen.getByRole('textbox', { name: 'note' }));
      await user.click(acceptButton());
      expect(formChange).toHaveBeenCalledExactlyOnceWith({
        type: 'lemma',
        prefix: undefined,
        value: 'cane',
        suffix: undefined,
        pos: 'n',
        features: [],
        tags: [],
        note: undefined,
      });
    });

    it('should save values picked from selects', async () => {
      const { user, formChange } = await setup({
        form: FORM,
        typeEntries: TYPES,
        prefixEntries: PREFIXES,
        suffixEntries: SUFFIXES,
      });
      await pickOption(user, 'type', 'variant form');
      await pickOption(user, 'prefix', 's-');
      await pickOption(user, 'suffix', '-one');
      await user.click(acceptButton());
      expect(formChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'var', prefix: 's', suffix: 'one' }),
      );
    });

    it('should allow clearing a selected prefix and suffix', async () => {
      const { user, formChange } = await setup({
        form: { ...FORM, prefix: 'ri', suffix: 'ino' },
        prefixEntries: PREFIXES,
        suffixEntries: SUFFIXES,
      });
      await pickOption(user, 'prefix', '(none)');
      await pickOption(user, 'suffix', '(none)');
      await user.click(acceptButton());
      expect(formChange).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: undefined, suffix: undefined }),
      );
    });

    it('should save a changed POS', async () => {
      const { user, formChange } = await setup({ form: FORM });
      await user.click(screen.getByRole('button', { name: 'remove noun' }));
      await user.click(screen.getByRole('button', { name: 'pick verb' }));
      await user.click(acceptButton());
      expect(formChange).toHaveBeenCalledWith(expect.objectContaining({ pos: 'v' }));
    });

    it('should save removed features and tags', async () => {
      const { user, formChange } = await setup({
        form: { ...FORM, features: ['m', 'f'], tags: ['rare'] },
        featureEntries: FEATURES,
        tagEntries: TAGS,
      });
      await user.click(screen.getByRole('button', { name: 'remove masculine' }));
      await user.click(screen.getByRole('button', { name: 'remove rare' }));
      await user.click(acceptButton());
      expect(formChange).toHaveBeenCalledWith(
        expect.objectContaining({ features: ['f'], tags: [] }),
      );
    });

    it('should emit cancelEdit on discard', async () => {
      const { user, cancelEdit, formChange } = await setup({ form: FORM });
      await user.type(screen.getByRole('textbox', { name: 'value' }), 'x');
      await user.click(screen.getByRole('button', { description: 'Discard changes' }));
      expect(cancelEdit).toHaveBeenCalledOnce();
      expect(formChange).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should require a value', async () => {
      const { user } = await setup({ form: FORM });
      await user.clear(screen.getByRole('textbox', { name: 'value' }));
      await user.tab();
      expect(screen.getByText('value required')).toBeInTheDocument();
      expect(acceptButton()).toBeDisabled();
    });

    it('should require a type', async () => {
      const { user } = await setup({ form: FORM });
      await user.clear(screen.getByRole('textbox', { name: 'type' }));
      await user.tab();
      expect(screen.getByText('type required')).toBeInTheDocument();
      expect(acceptButton()).toBeDisabled();
    });

    it('should report too long values', async () => {
      const { user } = await setup({ form: FORM });
      const check = async (label: string, length: number) => {
        const input = screen.getByRole('textbox', { name: label });
        await user.clear(input);
        await user.click(input);
        await user.paste('x'.repeat(length));
        await user.tab();
        expect(screen.getByText(`${label} too long`)).toBeInTheDocument();
      };
      await check('type', 51);
      await check('prefix', 51);
      await check('value', 501);
      await check('suffix', 51);
      expect(acceptButton()).toBeDisabled();
    });

    it('should require a POS', async () => {
      const { user, formChange } = await setup({ form: FORM });
      await user.type(screen.getByRole('textbox', { name: 'value' }), 's');
      await user.click(screen.getByRole('button', { name: 'remove noun' }));
      expect(acceptButton()).toBeDisabled();
      // submitting anyway (e.g. with Enter) does not save
      await user.type(screen.getByRole('textbox', { name: 'value' }), '{Enter}');
      expect(formChange).not.toHaveBeenCalled();
    });
  });

  describe('with the real thesaurus picker', () => {
    beforeEach(() => {
      // the real picker's tree store is chatty
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('should not break when the POS entry is removed', async () => {
      const { user } = await setup({ form: FORM, realPicker: true });
      expect(screen.getByRole('option', { name: /noun/ })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Remove entry' }));

      expect(screen.queryByRole('option', { name: /noun/ })).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'value' })).toHaveValue('cane');
      expect(acceptButton()).toBeDisabled();
    });
  });
});
