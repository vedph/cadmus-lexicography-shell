# Changelog

## Unreleased

### Infrastructure

- replaced the libraries build script (`pnpm run build:libs`) with `scripts/build-libs.mjs`, which builds the libraries in dependency order (derived from both their manifests and their actual imports) after checking that no local library is shadowed by a copy in `node_modules` (`scripts/check-local-libs.js`, also available as `pnpm run check-libs`). Pass library names to rebuild only them and everything depending on them.
- migrated tests from Karma/Jasmine to Vitest via the Angular `@angular/build:unit-test` builder (jsdom environment), with Angular Testing Library (`@testing-library/angular`, `@testing-library/user-event`) and `@testing-library/jest-dom` matchers (registered in `test-setup.ts`). Removed all the Karma and Jasmine packages. Library test targets use the app's zoneless `testing` build configuration. Added `test:<lib>` and `test:libs` scripts.
- pnpm settings moved from `package.json` (no longer read by pnpm 12) into `pnpm-workspace.yaml`; added an override forcing `@jridgewell/sourcemap-codec` to `^1.6.0`, required by `@angular/compiler-cli` 22.2 but not declared by it; set `extendNodePath: false`, because the `NODE_PATH` set by pnpm's command shims made the test builder detect a `zone.js` that Vite could not then resolve.
- test helpers shared by the specs of a library live in its `src/testing` folder, excluded from the library build and from coverage.

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
