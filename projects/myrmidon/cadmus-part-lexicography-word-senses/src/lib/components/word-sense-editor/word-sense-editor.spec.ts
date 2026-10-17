import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { CADMUS_TEXT_ED_BINDINGS_TOKEN, CadmusTextEdService } from '@myrmidon/cadmus-text-ed';

import { stubAssertedCompositeIds } from '../../../testing/asserted-composite-ids-stub';
import { createMonacoEditorMock, stubMonacoEditor } from '../../../testing/monaco';
import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { WordSense } from '../../lex-word-senses-part';
import { WordSenseExampleEditor } from '../word-sense-example-editor/word-sense-example-editor';
import { WordSenseEditor } from './word-sense-editor';

const TAGS: ThesaurusEntry[] = [
  { id: 'lit', value: 'literary' },
  { id: 'fam', value: 'familiar' },
];

function createSense(): WordSense {
  return {
    eid: 's1',
    tags: ['lit'],
    definition: 'a domestic animal',
    note: 'a note',
    examples: [
      { text: 'alpha', tags: ['lit', 'fam'] },
      { text: 'beta' },
      { text: 'gamma' },
    ],
    relatedIds: [{ target: { gid: 'x', label: 'related x' } }],
  };
}

interface SetupOptions {
  sense?: WordSense;
  tagEntries?: ThesaurusEntry[];
  bindings?: Record<number, string>;
  [key: string]: unknown;
}

type User = ReturnType<typeof userEvent.setup>;

async function setup(options: SetupOptions = {}) {
  stubThesaurusEntriesPicker(WordSenseEditor, WordSenseExampleEditor);
  stubAssertedCompositeIds(WordSenseEditor);
  const monaco = createMonacoEditorMock();
  const monacoProviders = stubMonacoEditor(monaco.editor, WordSenseEditor, WordSenseExampleEditor);
  const editService = { edit: vi.fn(async (q: { text: string }) => ({ text: `_${q.text}_` })) };
  const user = userEvent.setup();
  const senseChange = vi.fn();
  const cancelEdit = vi.fn();
  const { bindings, ...inputs } = options;
  const result = await render(WordSenseEditor, {
    inputs,
    on: { cancelEdit },
    providers: [
      ...monacoProviders,
      { provide: CadmusTextEdService, useValue: editService },
      ...(bindings ? [{ provide: CADMUS_TEXT_ED_BINDINGS_TOKEN, useValue: bindings }] : []),
    ],
  });
  // senseChange is the output of the sense model
  result.fixture.componentInstance.sense.subscribe(senseChange);
  return { ...result, user, monaco, editService, senseChange, cancelEdit };
}

function definitionEditor(): HTMLElement {
  return within(screen.getByRole('group', { name: 'definition' })).getByRole('textbox');
}

/** The sense's accept button (the last one, after the example editor's one if any). */
function acceptButton(): HTMLElement {
  return screen.getAllByRole('button', { description: 'Accept changes' }).at(-1)!;
}

async function openTab(user: User, name: string) {
  await user.click(screen.getByRole('tab', { name }));
  await waitFor(() =>
    expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true'),
  );
}

/** Get the cells of the examples table rows, header excluded. */
function listedExamples(): string[][] {
  return screen
    .queryAllByRole('row')
    .slice(1)
    .map((r) =>
      within(r)
        .getAllByRole('cell')
        .slice(1)
        .map((c) => c.textContent!.replace(/\s+/g, ' ').trim()),
    );
}

function exampleButton(index: number, description: string): HTMLElement {
  const row = screen.getAllByRole('row').slice(1)[index];
  return within(row).getByRole('button', { description });
}

/** Get the text editor of the example being edited. */
function exampleTextEditor(): HTMLElement {
  return within(screen.getByRole('group', { name: 'text' })).getByRole('textbox');
}

async function setExampleText(user: User, text: string) {
  await user.clear(exampleTextEditor());
  await user.type(exampleTextEditor(), text);
}

async function acceptExample(user: User) {
  await user.click(screen.getAllByRole('button', { description: 'Accept changes' })[0]);
}

async function answerDialog(user: User, answer: 'yes' | 'no') {
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: answer }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('WordSenseEditor', () => {
  describe('definition', () => {
    it('should load the sense', async () => {
      await setup({ sense: createSense(), tagEntries: TAGS });
      expect(screen.getByRole('textbox', { name: 'EID' })).toHaveValue('s1');
      expect(screen.getByRole('button', { name: 'remove literary' })).toBeInTheDocument();
      expect(definitionEditor()).toHaveValue('a domestic animal');
      expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue('a note');
    });

    it('should show tags only with their thesaurus', async () => {
      await setup({ sense: createSense() });
      expect(screen.queryByRole('button', { name: /^pick/ })).not.toBeInTheDocument();
    });

    it('should preview the definition as Markdown', async () => {
      const { user } = await setup({ sense: createSense() });
      await user.clear(definitionEditor());
      await user.type(definitionEditor(), '# Dog');
      expect(await screen.findByRole('heading', { level: 1, name: 'Dog' })).toBeInTheDocument();
    });

    it('should emit the edited sense', async () => {
      const { user, senseChange } = await setup({ sense: createSense(), tagEntries: TAGS });
      await user.clear(screen.getByRole('textbox', { name: 'EID' }));
      await user.type(screen.getByRole('textbox', { name: 'EID' }), 's2');
      await user.click(screen.getByRole('button', { name: 'pick familiar' }));
      await user.clear(definitionEditor());
      await user.type(definitionEditor(), '  a pet  ');
      await user.clear(screen.getByRole('textbox', { name: 'note' }));
      await user.type(screen.getByRole('textbox', { name: 'note' }), ' hi ');
      await user.click(acceptButton());

      const sense = createSense();
      expect(senseChange).toHaveBeenCalledExactlyOnceWith({
        eid: 's2',
        tags: ['lit', 'fam'],
        definition: 'a pet',
        note: 'hi',
        examples: sense.examples,
        relatedIds: sense.relatedIds,
      });
      expect(acceptButton()).toBeDisabled();
    });

    it('should omit empty optional values', async () => {
      const { user, senseChange } = await setup({
        sense: { eid: 's1', definition: 'def', note: 'n' },
      });
      await user.clear(screen.getByRole('textbox', { name: 'EID' }));
      await user.clear(screen.getByRole('textbox', { name: 'note' }));
      await user.click(acceptButton());
      expect(senseChange).toHaveBeenCalledExactlyOnceWith({
        eid: undefined,
        tags: undefined,
        definition: 'def',
        note: undefined,
        examples: undefined,
        relatedIds: undefined,
      });
    });

    it('should require a definition', async () => {
      const { user, senseChange } = await setup({ sense: createSense() });
      await user.clear(definitionEditor());
      expect(screen.getByText('text required')).toBeInTheDocument();
      expect(acceptButton()).toBeDisabled();
      await user.type(screen.getByRole('textbox', { name: 'EID' }), '{Enter}');
      expect(senseChange).not.toHaveBeenCalled();
    });

    it('should limit the length of text inputs while typing', async () => {
      await setup({ sense: createSense() });
      expect(screen.getByRole('textbox', { name: 'EID' })).toHaveAttribute('maxlength', '50');
      expect(screen.getByRole('textbox', { name: 'note' })).toHaveAttribute('maxlength', '1000');
    });

    it('should report too long values', async () => {
      // text inputs prevent typing them, but they can come from data
      const { user } = await setup({
        sense: { ...createSense(), eid: 'x'.repeat(51), note: 'x'.repeat(1001) },
      });
      for (const name of ['EID', 'note']) {
        await user.click(screen.getByRole('textbox', { name }));
        await user.tab();
        expect(screen.getByText(`${name} too long`)).toBeInTheDocument();
      }
      // the definition editor has no length limit while typing
      await user.clear(definitionEditor());
      await user.click(definitionEditor());
      await user.paste('x'.repeat(5001));
      await user.tab();
      expect(screen.getByText('text too long')).toBeInTheDocument();
      expect(acceptButton()).toBeDisabled();
    });

    it('should save on Enter in a text input once changed', async () => {
      const { user, senseChange } = await setup({ sense: createSense() });
      await user.type(screen.getByRole('textbox', { name: 'EID' }), '2{Enter}');
      expect(senseChange).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ eid: 's12' }),
      );
    });

    it('should keep the typed text when its own save comes back normalized', async () => {
      const { user, senseChange } = await setup({ sense: createSense() });
      const eid = screen.getByRole('textbox', { name: 'EID' });
      await user.type(eid, ' ');
      await user.click(acceptButton());
      expect(senseChange).toHaveBeenCalledWith(expect.objectContaining({ eid: 's1' }));
      expect(eid).toHaveValue('s1 ');
      await user.type(eid, 'x');
      expect(eid).toHaveValue('s1 x');
    });

    it('should emit cancelEdit on discard', async () => {
      const { user, cancelEdit, senseChange } = await setup({ sense: createSense() });
      await user.type(screen.getByRole('textbox', { name: 'note' }), 'x');
      await user.click(screen.getByRole('button', { description: 'Discard changes' }));
      expect(cancelEdit).toHaveBeenCalledOnce();
      expect(senseChange).not.toHaveBeenCalled();
    });

    it('should apply text edits from bound keys', async () => {
      const { monaco, editService } = await setup({
        sense: createSense(),
        bindings: { 2080: 'md.italic' },
      });
      expect(monaco.editor.addCommand).toHaveBeenCalledOnce();
      monaco.commands.get(2080)!();
      await vi.waitFor(() => expect(monaco.editor.executeEdits).toHaveBeenCalledOnce());
      expect(editService.edit).toHaveBeenCalledWith({ selector: 'md.italic', text: 'selected' });
      expect(monaco.editor.executeEdits).toHaveBeenCalledWith('my-source', [
        { range: monaco.selection, text: '_selected_', forceMoveMarkers: true },
      ]);
    });
  });

  describe('examples', () => {
    it('should list the examples', async () => {
      const { user } = await setup({ sense: createSense(), tagEntries: TAGS });
      await openTab(user, 'examples');
      expect(listedExamples()).toEqual([
        ['literary , familiar', 'alpha'],
        ['', 'beta'],
        ['', 'gamma'],
      ]);
    });

    it('should add an example', async () => {
      const { user, senseChange } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(screen.getByRole('button', { name: 'example' }));
      expect(screen.getByText('New example')).toBeInTheDocument();
      await setExampleText(user, 'delta');
      await acceptExample(user);

      expect(listedExamples().map((r) => r[1])).toEqual(['alpha', 'beta', 'gamma', 'delta']);
      // accepting the example does not save the sense
      expect(senseChange).not.toHaveBeenCalled();
      await user.click(acceptButton());
      expect(senseChange).toHaveBeenCalledWith(
        expect.objectContaining({
          examples: [...createSense().examples!, expect.objectContaining({ text: 'delta' })],
        }),
      );
    });

    it('should edit an example', async () => {
      const { user } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(exampleButton(1, 'Edit this example'));
      expect(screen.getByText('Example #2')).toBeInTheDocument();
      expect(exampleTextEditor()).toHaveValue('beta');
      await setExampleText(user, 'BETA');
      await acceptExample(user);
      expect(listedExamples().map((r) => r[1])).toEqual(['alpha', 'BETA', 'gamma']);
      expect(acceptButton()).toBeEnabled();
    });

    it('should discard example changes', async () => {
      const { user } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(exampleButton(1, 'Edit this example'));
      await setExampleText(user, 'BETA');
      await user.click(screen.getAllByRole('button', { description: 'Discard changes' })[0]);
      expect(screen.queryByRole('group', { name: 'text' })).not.toBeInTheDocument();
      expect(listedExamples().map((r) => r[1])).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should move examples', async () => {
      const { user } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      expect(exampleButton(0, 'Move this example up')).toBeDisabled();
      expect(exampleButton(2, 'Move this example down')).toBeDisabled();
      await user.click(exampleButton(2, 'Move this example up'));
      expect(listedExamples().map((r) => r[1])).toEqual(['alpha', 'gamma', 'beta']);
      await user.click(exampleButton(0, 'Move this example down'));
      expect(listedExamples().map((r) => r[1])).toEqual(['gamma', 'alpha', 'beta']);
    });

    it('should save the edited example in its new position after moving', async () => {
      const { user } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(exampleButton(0, 'Edit this example'));
      await user.click(exampleButton(0, 'Move this example down'));
      expect(screen.getByText('Example #2')).toBeInTheDocument();
      await user.click(exampleButton(2, 'Move this example up'));
      expect(screen.getByText('Example #3')).toBeInTheDocument();
      await setExampleText(user, 'ALPHA');
      await acceptExample(user);
      expect(listedExamples().map((r) => r[1])).toEqual(['beta', 'gamma', 'ALPHA']);
    });

    it('should delete an example after confirmation', async () => {
      const { user } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(exampleButton(1, 'Delete this example'));
      expect(await screen.findByText('Delete example #2?')).toBeInTheDocument();
      await answerDialog(user, 'yes');
      expect(listedExamples().map((r) => r[1])).toEqual(['alpha', 'gamma']);
      expect(acceptButton()).toBeEnabled();
    });

    it('should not delete an example when not confirmed', async () => {
      const { user } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(exampleButton(1, 'Delete this example'));
      await answerDialog(user, 'no');
      expect(listedExamples()).toHaveLength(3);
    });

    it('should close the example editor when deleting its example', async () => {
      const { user } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(exampleButton(1, 'Edit this example'));
      await user.click(exampleButton(1, 'Delete this example'));
      await answerDialog(user, 'yes');
      expect(screen.queryByRole('group', { name: 'text' })).not.toBeInTheDocument();
    });

    it('should save the edited example in its place after deleting one before it', async () => {
      const { user } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(exampleButton(2, 'Edit this example'));
      await user.click(exampleButton(0, 'Delete this example'));
      await answerDialog(user, 'yes');
      expect(screen.getByText('Example #2')).toBeInTheDocument();
      await setExampleText(user, 'GAMMA');
      await acceptExample(user);
      expect(listedExamples().map((r) => r[1])).toEqual(['beta', 'GAMMA']);
    });

    it('should not save the sense on Enter in an unchanged example', async () => {
      const { user, senseChange } = await setup({ sense: createSense() });
      // the sense is changed, so Enter would save it
      await user.type(screen.getByRole('textbox', { name: 'EID' }), 'x');
      await openTab(user, 'examples');
      await user.click(exampleButton(1, 'Edit this example'));
      await user.type(screen.getByRole('textbox', { name: 'citation' }), '{Enter}');
      expect(senseChange).not.toHaveBeenCalled();
      expect(screen.getByRole('group', { name: 'text' })).toBeInTheDocument();
    });

    it('should save only the example on Enter in a changed example', async () => {
      const { user, senseChange } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(exampleButton(1, 'Edit this example'));
      await user.type(screen.getByRole('textbox', { name: 'citation' }), 'c{Enter}');
      expect(screen.queryByRole('group', { name: 'text' })).not.toBeInTheDocument();
      expect(senseChange).not.toHaveBeenCalled();
      expect(acceptButton()).toBeEnabled();
    });

    it('should render no <form> element, also with an example open', async () => {
      const { user, container } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(exampleButton(1, 'Edit this example'));
      expect(container.querySelector('form')).toBeNull();
    });

    it('should close the example editor when the sense changes', async () => {
      const { user, fixture } = await setup({ sense: createSense() });
      await openTab(user, 'examples');
      await user.click(exampleButton(1, 'Edit this example'));
      fixture.componentRef.setInput('sense', { definition: 'other', examples: [{ text: 'x' }] });
      await fixture.whenStable();
      expect(screen.queryByRole('group', { name: 'text' })).not.toBeInTheDocument();
      expect(listedExamples().map((r) => r[1])).toEqual(['x']);
    });
  });

  describe('related IDs', () => {
    it('should list and add related IDs', async () => {
      const { user, senseChange } = await setup({ sense: createSense() });
      await openTab(user, 'related');
      const list = screen.getByRole('list', { name: 'related IDs' });
      expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
        'related x',
      ]);
      await user.click(screen.getByRole('button', { name: 'add ID' }));
      await user.click(acceptButton());
      expect(senseChange).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedIds: [
            { target: { gid: 'x', label: 'related x' } },
            { target: { gid: 'id2', label: 'id2' } },
          ],
        }),
      );
    });

    it('should stay pristine when the related IDs editor echoes its IDs', async () => {
      // data often has nulls, which child editors drop when they emit
      const { fixture } = await setup({
        sense: {
          ...createSense(),
          relatedIds: [{ target: { gid: 'x', label: 'related x' }, tag: null as any }],
        },
      });
      fixture.componentInstance.onRelatedIdsChange([{ target: { gid: 'x', label: 'related x' } }]);
      await fixture.whenStable();
      expect(acceptButton()).toBeDisabled();
    });

    it('should pass the thesauri to the related IDs editor', async () => {
      const entries = (n: number) =>
        Array.from({ length: n }, (_, i) => ({ id: `e${i}`, value: `e${i}` }));
      const { user } = await setup({
        sense: createSense(),
        assIdScopeEntries: entries(1),
        assIdTagEntries: entries(2),
        assTagEntries: entries(3),
        refTypeEntries: entries(4),
        refTagEntries: entries(5),
        idFeatureEntries: entries(6),
      });
      await openTab(user, 'related');
      const thesauri = screen.getByLabelText('related IDs thesauri');
      expect(
        within(thesauri)
          .getAllByRole('definition')
          .map((dd) => dd.textContent),
      ).toEqual(['1', '2', '3', '4', '5', '6', 'none']);
    });
  });
});
