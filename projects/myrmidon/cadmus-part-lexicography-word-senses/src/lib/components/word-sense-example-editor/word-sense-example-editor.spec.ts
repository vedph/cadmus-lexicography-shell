import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { CADMUS_TEXT_ED_BINDINGS_TOKEN, CadmusTextEdService } from '@myrmidon/cadmus-text-ed';

import { createMonacoEditorMock, stubMonacoEditor } from '../../../testing/monaco';
import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { WordSenseExample } from '../../lex-word-senses-part';
import { WordSenseExampleEditor } from './word-sense-example-editor';

const TAGS: ThesaurusEntry[] = [
  { id: 'lit', value: 'literary' },
  { id: 'fam', value: 'familiar' },
];

const EXAMPLE: WordSenseExample = {
  tags: ['lit'],
  text: 'il **cane** abbaia',
  explanation: 'the dog barks',
  citation: 'Manzoni 1.2',
  note: 'a note',
};

interface SetupOptions {
  example?: WordSenseExample;
  tagEntries?: ThesaurusEntry[];
  bindings?: Record<number, string>;
}

async function setup(options: SetupOptions = {}) {
  stubThesaurusEntriesPicker(WordSenseExampleEditor);
  const monaco = createMonacoEditorMock();
  const monacoProviders = stubMonacoEditor(monaco.editor, WordSenseExampleEditor);
  const editService = { edit: vi.fn(async (q: { text: string }) => ({ text: `**${q.text}**` })) };
  const user = userEvent.setup();
  const exampleChange = vi.fn();
  const cancelEdit = vi.fn();
  const { bindings, ...inputs } = options;
  const result = await render(WordSenseExampleEditor, {
    inputs,
    on: { cancelEdit },
    providers: [
      ...monacoProviders,
      { provide: CadmusTextEdService, useValue: editService },
      ...(bindings ? [{ provide: CADMUS_TEXT_ED_BINDINGS_TOKEN, useValue: bindings }] : []),
    ],
  });
  // exampleChange is the output of the example model
  result.fixture.componentInstance.example.subscribe(exampleChange);
  return { ...result, user, monaco, editService, exampleChange, cancelEdit };
}

/** Get the (fake) Monaco text area in the group with the specified name. */
function editorIn(name: string): HTMLElement {
  return within(screen.getByRole('group', { name })).getByRole('textbox');
}

function acceptButton(): HTMLElement {
  return screen.getByRole('button', { description: 'Accept changes' });
}

describe('WordSenseExampleEditor', () => {
  describe('rendering', () => {
    it('should load the example', async () => {
      await setup({ example: EXAMPLE, tagEntries: TAGS });
      expect(screen.getByRole('button', { name: 'remove literary' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'citation' })).toHaveValue('Manzoni 1.2');
      expect(editorIn('text')).toHaveValue('il **cane** abbaia');
      expect(editorIn('explanation')).toHaveValue('the dog barks');
      expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue('a note');
    });

    it('should show raw tag IDs without thesaurus entries', async () => {
      await setup({ example: { ...EXAMPLE, tags: ['x'] }, tagEntries: TAGS });
      expect(screen.getByRole('button', { name: 'remove x' })).toBeInTheDocument();
    });

    it('should show tags only with their thesaurus', async () => {
      await setup({ example: EXAMPLE });
      expect(screen.queryByRole('button', { name: /^pick/ })).not.toBeInTheDocument();
    });

    it('should allow editing the citation without tags thesaurus', async () => {
      const { user, exampleChange } = await setup({ example: EXAMPLE });
      const citation = screen.getByRole('textbox', { name: 'citation' });
      expect(citation).toHaveValue('Manzoni 1.2');
      await user.clear(citation);
      await user.type(citation, 'Dante');
      await user.click(acceptButton());
      expect(exampleChange).toHaveBeenCalledWith(expect.objectContaining({ citation: 'Dante' }));
    });

    it('should preview text and explanation as Markdown', async () => {
      const { user } = await setup({ example: { text: 'x' } });
      await user.clear(editorIn('text'));
      await user.type(editorIn('text'), '# Text title');
      await user.type(editorIn('explanation'), '## Explanation title');
      expect(await screen.findByRole('heading', { level: 1, name: 'Text title' })).toBeInTheDocument();
      expect(
        await screen.findByRole('heading', { level: 2, name: 'Explanation title' }),
      ).toBeInTheDocument();
    });

    it('should empty the fields when the example is cleared', async () => {
      const { fixture } = await setup({ example: EXAMPLE });
      fixture.componentRef.setInput('example', undefined);
      await fixture.whenStable();
      expect(editorIn('text')).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue('');
    });
  });

  describe('saving', () => {
    it('should disable accept while pristine', async () => {
      await setup({ example: EXAMPLE });
      expect(acceptButton()).toBeDisabled();
    });

    it('should emit the edited example', async () => {
      const { user, exampleChange } = await setup({ example: EXAMPLE, tagEntries: TAGS });
      await user.click(screen.getByRole('button', { name: 'pick familiar' }));
      await user.clear(editorIn('text'));
      await user.type(editorIn('text'), '  la gatta  ');
      await user.clear(editorIn('explanation'));
      await user.type(editorIn('explanation'), ' the cat ');
      await user.clear(screen.getByRole('textbox', { name: 'note' }));
      await user.type(screen.getByRole('textbox', { name: 'note' }), ' hello ');
      await user.click(acceptButton());

      expect(exampleChange).toHaveBeenCalledExactlyOnceWith({
        tags: ['lit', 'fam'],
        citation: 'Manzoni 1.2',
        text: 'la gatta',
        explanation: 'the cat',
        note: 'hello',
      });
      expect(acceptButton()).toBeDisabled();
    });

    it('should omit empty optional values', async () => {
      const { user, exampleChange } = await setup({ example: EXAMPLE, tagEntries: TAGS });
      await user.click(screen.getByRole('button', { name: 'remove literary' }));
      await user.clear(screen.getByRole('textbox', { name: 'citation' }));
      await user.clear(editorIn('explanation'));
      await user.clear(screen.getByRole('textbox', { name: 'note' }));
      await user.click(acceptButton());
      expect(exampleChange).toHaveBeenCalledExactlyOnceWith({
        tags: undefined,
        citation: undefined,
        text: 'il **cane** abbaia',
        explanation: undefined,
        note: undefined,
      });
    });

    it('should emit cancelEdit on discard', async () => {
      const { user, cancelEdit, exampleChange } = await setup({ example: EXAMPLE });
      await user.type(screen.getByRole('textbox', { name: 'note' }), 'x');
      await user.click(screen.getByRole('button', { description: 'Discard changes' }));
      expect(cancelEdit).toHaveBeenCalledOnce();
      expect(exampleChange).not.toHaveBeenCalled();
    });

    it('should not submit an enclosing form', async () => {
      stubThesaurusEntriesPicker(WordSenseExampleEditor);
      const monacoProviders = stubMonacoEditor(createMonacoEditorMock().editor, WordSenseExampleEditor);
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      await render(
        `<form (submit)="onSubmit()">
          <cadmus-word-sense-example-editor [example]="example" />
        </form>`,
        {
          imports: [WordSenseExampleEditor],
          componentProperties: { onSubmit, example: EXAMPLE },
          providers: [...monacoProviders, { provide: CadmusTextEdService, useValue: {} }],
        },
      );
      await user.type(screen.getByRole('textbox', { name: 'note' }), 'x');
      await user.click(acceptButton());
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should require a text', async () => {
      const { user, exampleChange } = await setup({ example: EXAMPLE });
      await user.clear(editorIn('text'));
      expect(screen.getByText('text required')).toBeInTheDocument();
      expect(acceptButton()).toBeDisabled();
      await user.type(screen.getByRole('textbox', { name: 'note' }), '{Enter}');
      expect(exampleChange).not.toHaveBeenCalled();
    });

    it('should limit the length of text inputs while typing', async () => {
      await setup({ example: EXAMPLE });
      expect(screen.getByRole('textbox', { name: 'citation' })).toHaveAttribute('maxlength', '500');
      expect(screen.getByRole('textbox', { name: 'note' })).toHaveAttribute('maxlength', '1000');
    });

    it('should report too long values', async () => {
      // text inputs prevent typing them, but they can come from data
      const { user } = await setup({
        example: { ...EXAMPLE, citation: 'x'.repeat(501), note: 'x'.repeat(1001) },
      });
      for (const name of ['citation', 'note']) {
        await user.click(screen.getByRole('textbox', { name }));
        await user.tab();
        expect(screen.getByText(`${name} too long`)).toBeInTheDocument();
      }
      // the Markdown editors have no length limit while typing
      const paste = async (input: HTMLElement, length: number) => {
        await user.clear(input);
        await user.click(input);
        await user.paste('x'.repeat(length));
        await user.tab();
      };
      await paste(editorIn('text'), 1001);
      expect(screen.getByText('text too long')).toBeInTheDocument();
      await paste(editorIn('explanation'), 1001);
      expect(screen.getByText('explanation too long')).toBeInTheDocument();
      expect(acceptButton()).toBeDisabled();
    });
  });

  describe('editor bindings', () => {
    it('should add no commands without bindings', async () => {
      const { monaco } = await setup({ example: EXAMPLE });
      expect(monaco.editor.addCommand).not.toHaveBeenCalled();
    });

    it('should apply text edits from bound keys in both editors', async () => {
      const { monaco, editService } = await setup({
        example: EXAMPLE,
        bindings: { 2080: 'md.bold' },
      });
      // one command for the text editor and one for the explanation editor
      expect(monaco.editor.addCommand).toHaveBeenCalledTimes(2);
      for (const [key, handler] of monaco.editor.addCommand.mock.calls) {
        expect(key).toBe(2080);
        handler();
      }
      await vi.waitFor(() => expect(monaco.editor.executeEdits).toHaveBeenCalledTimes(2));
      expect(editService.edit).toHaveBeenCalledWith({ selector: 'md.bold', text: 'selected' });
      expect(monaco.editor.executeEdits).toHaveBeenCalledWith('my-source', [
        { range: monaco.selection, text: '**selected**', forceMoveMarkers: true },
      ]);
    });
  });
});
