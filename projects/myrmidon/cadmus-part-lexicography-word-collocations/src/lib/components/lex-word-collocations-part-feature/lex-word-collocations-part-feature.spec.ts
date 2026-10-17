import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { EditedObject } from '@myrmidon/cadmus-core';

import {
  createPartFeatureProviders,
  PartFeatureTestOptions,
} from '../../../testing/part-feature-providers';
import { stubThesaurusEntriesPicker } from '../../../testing/thesaurus-entries-picker-stub';
import {
  LEX_WORD_COLLOCATIONS_PART_TYPEID,
  LexWordCollocationsPart,
} from '../../lex-word-collocations-part';
import { WordCollocLiteralEditor } from '../word-colloc-literal-editor/word-colloc-literal-editor';
import { WordCollocTokenEditor } from '../word-colloc-token-editor/word-colloc-token-editor';
import { LexWordCollocationsPartFeature } from './lex-word-collocations-part-feature';

const THESAURI_IDS = [
  'lex-word-collocation-tags',
  'lex-word-ctoken-pos-tags',
  'lex-word-ctoken-features',
  'lex-word-cliteral-tags',
];

function createData(): EditedObject<LexWordCollocationsPart> {
  return {
    value: {
      id: 'part-1',
      itemId: 'item-1',
      typeId: LEX_WORD_COLLOCATIONS_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'zeus',
      timeModified: new Date(),
      userId: 'zeus',
      collocations: [
        {
          tokens: [{ pos: 'a' }, { pos: 'n', isHead: true }],
          examples: [{ tokenNr: 2, literals: [{ value: 'tea' }] }],
        },
      ],
    },
    thesauri: {
      'lex-word-ctoken-pos-tags': {
        id: 'lex-word-ctoken-pos-tags@en',
        language: 'en',
        entries: [
          { id: 'a', value: 'ADJ' },
          { id: 'n', value: 'NOUN' },
        ],
      },
    },
  };
}

async function setup(options: Partial<PartFeatureTestOptions<LexWordCollocationsPart>> = {}) {
  stubThesaurusEntriesPicker(WordCollocTokenEditor, WordCollocLiteralEditor);
  // the base feature logs its activity
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const { providers, editorService } = createPartFeatureProviders<LexWordCollocationsPart>({
    typeId: LEX_WORD_COLLOCATIONS_PART_TYPEID,
    partId: 'part-1',
    data: createData(),
    ...options,
  });
  const user = userEvent.setup();
  const result = await render(LexWordCollocationsPartFeature, { providers });
  await result.fixture.whenStable();
  return { ...result, user, editorService };
}

describe('LexWordCollocationsPartFeature', () => {
  it('should load the part with its thesauri', async () => {
    const { editorService } = await setup();
    expect(editorService.load).toHaveBeenCalledExactlyOnceWith(
      {
        itemId: 'item-1',
        typeId: LEX_WORD_COLLOCATIONS_PART_TYPEID,
        partId: 'part-1',
        roleId: null,
      },
      THESAURI_IDS,
    );
    expect(await screen.findByRole('cell', { name: 'ADJ+<NOUN>: <tea>' })).toBeInTheDocument();
    expect(screen.getByText('Test item')).toBeInTheDocument();
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
    await user.click(await screen.findByPlaceholderText('collocation(s), one per line'));
    await user.paste('NOUN+<ADJ>:');
    await user.click(screen.getByRole('button', { description: 'Parse collocations and add them' }));
    expect(fixture.componentInstance.canDeactivate()).toBe(false);

    await user.click(screen.getByRole('button', { name: 'save' }));

    expect(editorService.save).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: 'part-1',
        collocations: [
          createData().value!.collocations[0],
          expect.objectContaining({ tokens: [{ pos: 'n' }, { pos: 'a', isHead: true }] }),
        ],
      }),
    );
    await waitFor(() => expect(screen.getByText('Part saved')).toBeInTheDocument());
    expect(fixture.componentInstance.canDeactivate()).toBe(true);
  });

  it('should restore dirty state when saving fails', async () => {
    const { user, editorService, fixture } = await setup();
    editorService.save.mockRejectedValueOnce(new Error('save failed'));
    const table = await screen.findByRole('table');
    await user.click(within(table).getByRole('button', { description: 'Edit this collocation' }));
    const rank = screen.getByRole('spinbutton', { name: 'rank' });
    await user.type(rank, '3');
    await user.click(screen.getAllByRole('button', { description: 'Accept changes' }).at(-1)!);
    await user.click(screen.getByRole('button', { name: 'save' }));
    expect(await screen.findByText('save failed')).toBeInTheDocument();
    expect(fixture.componentInstance.canDeactivate()).toBe(false);
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
