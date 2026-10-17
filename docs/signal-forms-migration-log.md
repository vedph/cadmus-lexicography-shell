# Signal forms migration log

Migration of the libraries from reactive forms to signal forms (`@angular/forms/signals`), after updating the `@myrmidon/cadmus-*` core packages to v20.

Conventions: **verified** means measured (test run, build, browser check), with how; **believed** means not measured, with how it could be checked.

## Infrastructure

- `scripts/build-libs.mjs` and `scripts/check-local-libs.js` already existed (commit 8e7d556), modelled on `cadmus-shell-v3/scripts`. **Verified**: `node scripts/build-libs.mjs --dry` reports the 5 local libraries resolving uniformly through tsconfig paths, with build order lemma, word-collocations, word-forms, word-senses, pg.

## @myrmidon/cadmus-part-lexicography-lemma

Components: `WordFormEditor` (manual save sub-editor), `WordFormSetEditor` (no forms, unchanged), `LexLemmaPartEditor` (part editor), `LexLemmaPartFeature` (unchanged).

- `WordFormEditor`: its public model is named `form`, so the signal form is `editForm`. The draft holds POS, features and tags as IDs, and the pickers get computed entries; so `required(p.pos)` checks a string (`''` = none) rather than an object. The default POS (first POS entry) comes from a string `computed`, so that new POS entry arrays with the same first entry do not rebuild the draft.
- **Verified** (test run with the check disabled): without the `previous` check in the draft's `linkedSignal`, the spec "should keep the typed text when its own save comes back normalized" fails, and only it.
- **Verified** (test run): `[formField]` sets the native `maxlength` attribute on inputs, so users can no longer type past a length limit, and "too long" messages appear only for over-long values coming from data. The two specs typing over-long values were rewritten to check the attribute, and to load over-long values.
- **Verified** (reading `cadmus-shell-v3` source): `CloseSaveButtonsComponent` disables save only when the form is invalid, not when pristine.
- Behavior changes: Enter in a pristine word form no longer emits it unchanged (it is gated like the accept button); text values are trimmed on save. The homograph `min`/`max` attributes, which reactive forms turned into validators, are now `min()`/`max()` rules.

## @myrmidon/cadmus-part-lexicography-word-forms

Components: `LexWordFormsPartEditor` (part editor, reusing `WordFormSetEditor` from lemma), `LexWordFormsPartFeature` (unchanged).

- Same pattern as `LexLemmaPartEditor`. **Verified** (test run against the rebuilt lemma `dist`): Enter in the nested word form editor accepts only the word form, not the part; no `<form>` is rendered with a word form open; loading a part leaves the editor pristine.
