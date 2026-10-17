import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { EditedObject } from '@myrmidon/cadmus-core';
import { WordFormEditor } from '@myrmidon/cadmus-part-lexicography-lemma';

import {
  createPartFeatureProviders,
  PartFeatureTestOptions,
} from '../../../testing/part-feature-providers';
import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import { LEX_WORD_FORMS_PART_TYPEID, LexWordFormsPart } from '../../lex-word-forms-part';
import { LexWordFormsPartFeature } from './lex-word-forms-part-feature';

const THESAURI_IDS = [
  'lex-word-form-types',
  'lex-word-form-prefixes',
  'lex-word-form-suffixes',
  'lex-pos-tags',
  'lex-word-form-features',
  'lex-word-form-tags',
];

function createData(): EditedObject<LexWordFormsPart> {
  return {
    value: {
      id: 'part-1',
      itemId: 'item-1',
      typeId: LEX_WORD_FORMS_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'zeus',
      timeModified: new Date(),
      userId: 'zeus',
      forms: [{ type: 'pl', value: 'cani', pos: 'n' }],
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

async function setup(options: Partial<PartFeatureTestOptions<LexWordFormsPart>> = {}) {
  stubThesaurusEntriesPicker(WordFormEditor);
  // the base feature logs its activity
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const { providers, editorService } = createPartFeatureProviders<LexWordFormsPart>({
    typeId: LEX_WORD_FORMS_PART_TYPEID,
    partId: 'part-1',
    data: createData(),
    ...options,
  });
  const user = userEvent.setup();
  const result = await render(LexWordFormsPartFeature, { providers });
  await result.fixture.whenStable();
  return { ...result, user, editorService };
}

describe('LexWordFormsPartFeature', () => {
  it('should load the part with its thesauri', async () => {
    const { editorService } = await setup();
    expect(editorService.load).toHaveBeenCalledExactlyOnceWith(
      { itemId: 'item-1', typeId: LEX_WORD_FORMS_PART_TYPEID, partId: 'part-1', roleId: null },
      THESAURI_IDS,
    );
    expect(await screen.findByRole('cell', { name: 'cani' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'noun' })).toBeInTheDocument();
    expect(screen.getByText('Test item')).toBeInTheDocument();
  });

  it('should load role-specific thesauri for a part with a role', async () => {
    // the service returns thesauri with the requested (suffixed) IDs
    const data = createData();
    data.thesauri = { 'lex-pos-tags_old': data.thesauri['lex-pos-tags'] };
    const { editorService } = await setup({ roleId: 'old', data });
    expect(editorService.load).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ roleId: 'old' }),
      THESAURI_IDS.map((id) => id + '_old'),
    );
    // thesauri are aliased with their unsuffixed IDs
    expect(await screen.findByRole('cell', { name: 'noun' })).toBeInTheDocument();
  });

  it('should load a new part', async () => {
    const { editorService } = await setup({ partId: 'new', data: undefined });
    expect(editorService.load).toHaveBeenCalledWith(
      expect.objectContaining({ partId: null }),
      THESAURI_IDS,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('should save the edited part', async () => {
    const { user, editorService, fixture } = await setup();
    await user.click(await screen.findByRole('button', { name: 'form' }));
    await user.type(screen.getByRole('textbox', { name: 'type' }), 'pl');
    await user.type(screen.getByRole('textbox', { name: 'value' }), 'gatti');
    await user.click(screen.getByRole('button', { description: 'Accept changes' }));
    expect(fixture.componentInstance.canDeactivate()).toBe(false);
    expect(editorService.save).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'save' }));

    expect(editorService.save).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: 'part-1',
        forms: [expect.objectContaining({ value: 'cani' }), expect.objectContaining({ value: 'gatti' })],
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
