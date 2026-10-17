import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { EditedObject } from '@myrmidon/cadmus-core';
import { CadmusTextEdService } from '@myrmidon/cadmus-text-ed';

import { stubAssertedCompositeIds } from '../../../testing/asserted-composite-ids-stub';
import { createMonacoEditorMock, stubMonacoEditor } from '../../../testing/monaco';
import {
  createPartFeatureProviders,
  PartFeatureTestOptions,
} from '../../../testing/part-feature-providers';
import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { LEX_WORD_SENSES_PART_TYPEID, LexWordSensesPart } from '../../lex-word-senses-part';
import { WordSenseEditor } from '../word-sense-editor/word-sense-editor';
import { WordSenseExampleEditor } from '../word-sense-example-editor/word-sense-example-editor';
import { LexWordSensesPartFeature } from './lex-word-senses-part-feature';

const THESAURI_IDS = [
  'lex-word-sense-tags',
  'asserted-id-scopes',
  'asserted-id-tags',
  'assertion-tags',
  'doc-reference-types',
  'doc-reference-tags',
  'asserted-id-features',
];

function createData(): EditedObject<LexWordSensesPart> {
  return {
    value: {
      id: 'part-1',
      itemId: 'item-1',
      typeId: LEX_WORD_SENSES_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'zeus',
      timeModified: new Date(),
      userId: 'zeus',
      senses: [{ tags: ['lit'], definition: 'alpha' }],
    },
    thesauri: {
      'lex-word-sense-tags': {
        id: 'lex-word-sense-tags@en',
        language: 'en',
        entries: [{ id: 'lit', value: 'literary' }],
      },
    },
  };
}

async function setup(options: Partial<PartFeatureTestOptions<LexWordSensesPart>> = {}) {
  stubThesaurusEntriesPicker(WordSenseEditor, WordSenseExampleEditor);
  stubAssertedCompositeIds(WordSenseEditor);
  const monacoProviders = stubMonacoEditor(
    createMonacoEditorMock().editor,
    WordSenseEditor,
    WordSenseExampleEditor,
  );
  // the base feature logs its activity
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const { providers, editorService } = createPartFeatureProviders<LexWordSensesPart>({
    typeId: LEX_WORD_SENSES_PART_TYPEID,
    partId: 'part-1',
    data: createData(),
    ...options,
  });
  const user = userEvent.setup();
  const result = await render(LexWordSensesPartFeature, {
    providers: [...providers, ...monacoProviders, { provide: CadmusTextEdService, useValue: {} }],
  });
  await result.fixture.whenStable();
  return { ...result, user, editorService };
}

describe('LexWordSensesPartFeature', () => {
  it('should load the part with its thesauri', async () => {
    const { editorService } = await setup();
    expect(editorService.load).toHaveBeenCalledExactlyOnceWith(
      { itemId: 'item-1', typeId: LEX_WORD_SENSES_PART_TYPEID, partId: 'part-1', roleId: null },
      THESAURI_IDS,
    );
    expect(await screen.findByRole('cell', { name: 'alpha' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'literary' })).toBeInTheDocument();
    expect(screen.getByText('Test item')).toBeInTheDocument();
  });

  it('should load role-specific thesauri for a part with a role', async () => {
    // the service returns thesauri with the requested (suffixed) IDs
    const data = createData();
    data.thesauri = { 'lex-word-sense-tags_old': data.thesauri['lex-word-sense-tags'] };
    const { editorService } = await setup({ roleId: 'old', data });
    expect(editorService.load).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ roleId: 'old' }),
      THESAURI_IDS.map((id) => id + '_old'),
    );
    // thesauri are aliased with their unsuffixed IDs
    expect(await screen.findByRole('cell', { name: 'literary' })).toBeInTheDocument();
  });

  it('should save the edited part', async () => {
    const { user, editorService, fixture } = await setup();
    await user.click(await screen.findByRole('button', { description: 'Edit this Sense' }));
    const definition = within(screen.getByRole('group', { name: 'definition' })).getByRole(
      'textbox',
    );
    await user.clear(definition);
    await user.type(definition, 'ALPHA');
    await user.click(screen.getByRole('button', { description: 'Accept changes' }));
    expect(editorService.save).not.toHaveBeenCalled();
    expect(fixture.componentInstance.canDeactivate()).toBe(false);

    await user.click(screen.getByRole('button', { name: 'save' }));

    expect(editorService.save).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: 'part-1',
        senses: [expect.objectContaining({ definition: 'ALPHA', tags: ['lit'] })],
      }),
    );
    await waitFor(() => expect(screen.getByText('Part saved')).toBeInTheDocument());
    expect(fixture.componentInstance.canDeactivate()).toBe(true);
  });

  it('should navigate to the item on close', async () => {
    const { user } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await user.click(await screen.findByRole('button', { name: 'close' }));
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['items', 'item-1']);
  });

  it('should report load errors', async () => {
    await setup({ loadError: 'load failed' });
    expect(await screen.findByText('load failed')).toBeInTheDocument();
  });
});
