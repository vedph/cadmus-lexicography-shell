# Changelog

## Unreleased

### Signal forms

⚠️ Updated the `@myrmidon/cadmus-*` core packages to v20, and migrated all the editors from reactive forms to Angular signal forms (`@angular/forms/signals`). Inputs, models and outputs are unchanged. Breaking for code that reached into the components' internals: the former public `FormControl`/`FormGroup` fields are now fields of a signal form. No editor renders a `<form>` element any more: part editors save only through their save button, and sub-editors save on Enter in a text input only when their accept button is enabled. Since inputs now get a native `maxlength`, text cannot be typed past its limit. Text values are trimmed on save. See `docs/signal-forms-migration-log.md` for details.

- `@myrmidon/cadmus-part-lexicography-lemma`:
  - `WordFormEditor`: the form is now `editForm` (the `form` model is unchanged). Removed messages which could never appear (prefix and suffix required, note too long).
  - `LexLemmaPartEditor`: `lid`, `homograph` and `forms` are now `form.lid`, `form.homograph` and `form.forms`; the thesauri entries are computed signals.
- `@myrmidon/cadmus-part-lexicography-word-forms`: `LexWordFormsPartEditor.forms` is now `form.forms`; the thesauri entries are computed signals.

### Infrastructure

- replaced the libraries build script (`pnpm run build:libs`) with `scripts/build-libs.mjs`, which builds the libraries in dependency order (derived from both their manifests and their actual imports) after checking that no local library is shadowed by a copy in `node_modules` (`scripts/check-local-libs.js`, also available as `pnpm run check-libs`). Pass library names to rebuild only them and everything depending on them.
- migrated tests from Karma/Jasmine to Vitest via the Angular `@angular/build:unit-test` builder (jsdom environment), with Angular Testing Library (`@testing-library/angular`, `@testing-library/user-event`) and `@testing-library/jest-dom` matchers (registered in `test-setup.ts`). Removed all the Karma and Jasmine packages. Library test targets use the app's zoneless `testing` build configuration. Added `test:<lib>` and `test:libs` scripts.
- pnpm settings moved from `package.json` (no longer read by pnpm 12) into `pnpm-workspace.yaml`; added an override forcing `@jridgewell/sourcemap-codec` to `^1.6.0`, required by `@angular/compiler-cli` 22.2 but not declared by it; set `extendNodePath: false`, because the `NODE_PATH` set by pnpm's command shims made the test builder detect a `zone.js` that Vite could not then resolve.
- test helpers shared by the specs of a library live in its `src/testing` folder, excluded from the library build and from coverage.
- `test-providers.ts` provides global test providers: it disables Material animations, as jsdom does not run CSS transitions, and some Material components (like tabs) wait for their end before showing their content. Library coverage reports include only the library's own sources (`--coverage`).
- added a test for the routes of `@myrmidon/cadmus-part-lexicography-pg`, which had no tests.

### @myrmidon/cadmus-part-lexicography-lemma

Added tests for all the components. Fixes:

- `WordFormEditor`: accepting a word form also saved the whole lemma part. The word form `<form>` is nested in the part's `<form>`, so its `submit` event bubbled up to the part editor, triggering its save (and so persisting the part) whenever the part was valid. The nested form now stops the propagation of its `submit` event.
- `WordFormEditor`: removing the POS from its picker crashed the editor (`Cannot read properties of undefined (reading 'id')`), because the POS control was set to `undefined` and passed as `[undefined]` to the picker. Also, a missing POS was represented by an empty `{id: '', value: ''}` entry, which passed the `required` validator and was shown as a blank chip. The POS control is now nullable: a missing POS is `null`, so it is correctly required, and the picker gets no entries for it.
- `WordFormEditor`, `LexLemmaPartEditor`: "too long" errors were never shown, because templates checked for a `maxLength` error key while Angular's validator uses `maxlength`.
- `WordFormEditor`: once a prefix or suffix was picked from its thesaurus, it could not be removed, as the select had no empty option. Added a `(none)` option.
- `WordFormSetEditor`: deleting a form before the edited one, or moving the edited form (or its neighbor), left the edited form index stale, so that saving the edited form replaced the wrong one. The index now follows the list changes.
- `WordFormSetEditor`: a new form was titled `form #0`; it is now titled `new form`.
- `LexLemmaPartEditor`: a lemma could be saved without forms, while its schema requires at least one (the editor just showed an error icon). Forms are now required, like in the word senses and collocations part editors.

### @myrmidon/cadmus-part-lexicography-word-forms

Added tests for all the components. Fixes:

- `LexWordFormsPartEditor`: a part could be saved without forms, while its schema requires at least one (the editor just showed an error icon). Forms are now required.
- the fixes to the word form editors of `@myrmidon/cadmus-part-lexicography-lemma`, which this part reuses, also apply here: in particular, accepting a word form no longer saves the whole part.

### @myrmidon/cadmus-part-lexicography-word-senses

Added tests for all the components. Fixes:

- `WordSenseEditor`, `WordSenseExampleEditor`: accepting a sense also saved the whole part, and accepting an example also accepted its sense (and so possibly saved the part too), because their nested forms let the `submit` event bubble up to the enclosing forms. The nested forms now stop its propagation.
- `LexWordSensesPartEditor`: the related IDs editor never got the thesauri for ID scopes and tags, assertion tags, and document reference types and tags, because the part editor did not pass them to the sense editor, even if they were loaded. Also, the feature did not request the `assertion-tags` thesaurus. All these thesauri are now requested and passed down.
- `WordSenseExampleEditor`: the citation field was shown only when the example tags thesaurus was present, as it was wrongly placed in the tags block. It is now always shown.
- `LexWordSensesPartEditor`, `WordSenseEditor`: deleting a sense/example before the edited one, or moving the edited sense/example (or its neighbor), left the edited index stale, so that saving replaced the wrong sense/example. The index now follows the list changes. New senses/examples were titled `#0`, they are now titled `New sense`/`New example`.
- `WordSenseEditor`: an example being edited stayed open when the edited sense changed, so that saving it would have added it to the wrong sense. The example editor is now closed when the sense changes.
- `WordSenseEditor`, `WordSenseExampleEditor`: "too long" errors were never shown, because templates checked for a `maxLength` error key while Angular's validator uses `maxlength`.
- `WordSenseEditor`, `WordSenseExampleEditor`: their preview subscriptions to form value changes were never unsubscribed; they are now bound to the component lifetime. Also replaced an import from the `rxjs/internal` path with the public `rxjs` one.
- `WordSenseEditor`, `WordSenseExampleEditor`: the Markdown editor groups (definition, text, explanation) had only an icon as their legend, so they had no accessible name: added labels.

### @myrmidon/cadmus-part-lexicography-word-collocations

Added tests for all the components and for the collocation pipe, and more tests for the collocations parser (whose existing spec used Jasmine's `fdescribe`, unavailable in Vitest). Fixes:

- `WordCollocEditor`, `WordCollocTokenEditor`, `WordCollocExampleEditor`, `WordCollocLiteralEditor`, `LexWordCollocationPartEditor` (batch form): accepting a nested editor also submitted all its enclosing forms, so that e.g. accepting a token also accepted its collocation, and could save the whole part. The nested forms now stop the propagation of their `submit` event. In `WordCollocExampleEditor`, which had a plain `<form>` without a form directive, pressing Enter in the token number field also triggered the browser's native submission.
- `WordCollocExampleEditor`: the token number was never loaded from the edited example (it was set only once from the default example, when building the component), so editing an example always showed token 1, and saving it changed its token number to 1.
- `WordCollocExampleEditor`: the token number had to be at least 1, while 0 is the documented value for connective text (and is produced by the collocations parser). Now 0 is allowed.
- `WordCollocExampleEditor`: discarding the changes of a literal closed the whole example editor, rather than just the literal editor.
- `WordCollocExampleEditor`: the editor was marked as changed as soon as it was shown, because revalidating the token number when setting its maximum value was taken as a user change.
- `WordCollocEditor`: moving or deleting a pattern token did not update the example tokens referring to pattern tokens by their number, so that examples ended up referring to the wrong tokens. Now moved tokens keep their examples, and examples of deleted tokens become connective text (0).
- `WordCollocEditor`: a new example defaulted to a token number beyond the last pattern token, which was invalid; it now defaults to the token following the last example's one, up to the last pattern token.
- `WordCollocEditor`: the collocation note was loaded and saved, but there was no field to edit it. Added the note field.
- `WordCollocEditor`: adding a token without the POS tags thesaurus crashed the editor.
- `WordCollocEditor`: once a tag was picked from its thesaurus, it could not be removed, as the select had no empty option. Added a `(none)` option.
- `WordCollocTokenEditor`: removing the POS from its picker crashed the editor, and a missing POS was represented by an empty entry which passed the `required` validator (the same bug fixed in the lemma's `WordFormEditor`). The POS control is now nullable.
- `WordCollocTokenEditor`: the `MatTooltip` directive was not imported, so the buttons had no tooltips.
- `WordCollocLiteralEditor`: without the literal tags thesaurus, the tag text field was bound to a control holding a thesaurus entry, so that a loaded tag was displayed as `[object Object]`, and a typed tag was not saved. The free tag now has its own text control (max 50 characters).
- `LexWordCollocationPartEditor`: collocations added in batch were parsed without mapping the POS labels to their IDs, while the list displays POS mapping IDs to labels: so typing a collocation like it is displayed stored labels instead of IDs.
- `LexWordCollocationPartEditor`: batch parsing errors were never shown. Also, on success the batch text was kept, so that adding it again duplicated the collocations: now it is cleared.
- `LexWordCollocationPartEditor`: the edited collocation row was never highlighted, because it was compared by reference with a copy; and the tag column showed the tag ID rather than its thesaurus label.
- `LexWordCollocationPartEditor`, `WordCollocEditor`, `WordCollocExampleEditor`: deleting an item before the edited one, or moving the edited item (or its neighbor), left the edited index stale, so that saving replaced the wrong item. The index now follows the list changes. New items were titled `#0`, they are now titled `New ...`.
- all editors: "too long" errors were never shown, because templates checked for a `maxLength` error key while Angular's validator uses `maxlength`.
- `LexWordCollocationPartEditor`: imported the parser from the library's own public API, a circular import; now it imports it directly.
