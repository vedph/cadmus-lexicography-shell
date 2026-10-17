import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { EditedObject } from '@myrmidon/cadmus-core';

import {
  createPartFeatureProviders,
  PartFeatureTestOptions,
} from '../../../testing/part-feature-providers';
import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { LEX_LEMMA_PART_TYPEID, LexLemmaPart } from '../../lex-lemma-part';
import { LEX_LEMMA_PART_LID_GENERATOR_TOKEN } from '../lex-lemma-part-editor/lex-lemma-part-editor';
import { WordFormEditor } from '../word-form-editor/word-form-editor';
import { LexLemmaPartFeature } from './lex-lemma-part-feature';

const THESAURI_IDS = [
  'lex-word-form-types',
  'lex-word-form-prefixes',
  'lex-word-form-suffixes',
  'lex-pos-tags',
  'lex-word-form-features',
  'lex-word-form-tags',
];

function createData(): EditedObject<LexLemmaPart> {
  return {
    value: {
      id: 'part-1',
      itemId: 'item-1',
      typeId: LEX_LEMMA_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'zeus',
      timeModified: new Date(),
      userId: 'zeus',
      lid: 'cane',
      forms: [{ type: 'lemma', value: 'cane', pos: 'n' }],
    },
    thesauri: {
      'lex-pos-tags': {
        id: 'lex-pos-tags@en',
        language: 'en',
        entries: [{ id: 'n', value: 'noun' }],
      },
    },
  };
}

async function setup(options: Partial<PartFeatureTestOptions<LexLemmaPart>> = {}) {
  stubThesaurusEntriesPicker(WordFormEditor);
  // the base feature logs its activity
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const { providers, editorService } = createPartFeatureProviders<LexLemmaPart>({
    typeId: LEX_LEMMA_PART_TYPEID,
    partId: 'part-1',
    data: createData(),
    ...options,
  });
  const user = userEvent.setup();
  const result = await render(LexLemmaPartFeature, {
    providers: [
      ...providers,
      { provide: LEX_LEMMA_PART_LID_GENERATOR_TOKEN, useValue: { getLid: () => 'lid' } },
    ],
  });
  await result.fixture.whenStable();
  return { ...result, user, editorService };
}

describe('LexLemmaPartFeature', () => {
  it('should load the part with its thesauri', async () => {
    const { editorService } = await setup();
    expect(editorService.load).toHaveBeenCalledExactlyOnceWith(
      { itemId: 'item-1', typeId: LEX_LEMMA_PART_TYPEID, partId: 'part-1', roleId: null },
      THESAURI_IDS,
    );
    expect(await screen.findByRole('textbox', { name: 'LID' })).toHaveValue('cane');
    expect(screen.getByRole('cell', { name: 'noun' })).toBeInTheDocument();
  });

  it('should show the current item', async () => {
    await setup();
    expect(screen.getByText('Test item')).toBeInTheDocument();
  });

  it('should load a new part', async () => {
    const { editorService } = await setup({ partId: 'new', data: undefined });
    expect(editorService.load).toHaveBeenCalledWith(
      expect.objectContaining({ partId: null }),
      THESAURI_IDS,
    );
    expect(screen.getByRole('textbox', { name: 'LID' })).toHaveValue('');
  });

  it('should save the edited part', async () => {
    const { user, editorService, fixture } = await setup();
    const lid = await screen.findByRole('textbox', { name: 'LID' });
    await user.clear(lid);
    await user.type(lid, 'gatto');
    expect(fixture.componentInstance.canDeactivate()).toBe(false);

    await user.click(screen.getByRole('button', { name: 'save' }));

    expect(editorService.save).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: 'part-1', lid: 'gatto' }),
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
