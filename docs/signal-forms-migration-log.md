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

## @myrmidon/cadmus-part-lexicography-word-senses

Components: `WordSenseExampleEditor` and `WordSenseEditor` (manual save sub-editors, with Monaco), `LexWordSensesPartEditor` (part editor), `LexWordSensesPartFeature` (unchanged).

- **Enter in nested sub-editors (applies to all sub-editors, lemma's `WordFormEditor` included).** The template's `onEnterKey` returns without `preventDefault()` when the form is pristine or invalid, so the `keydown` bubbles to an enclosing sub-editor, whose own handler then saves it. **Verified** (test run with the template's handler in `WordSenseExampleEditor`): Enter in an unchanged example's citation then saves the enclosing changed sense ("should not save the sense on Enter in an unchanged example" fails). So sub-editors claim every implicit-submission Enter (`preventDefault()`), and save only when dirty (`save()` still refuses an invalid form and shows its errors). This restores the old innermost-form behavior.
- `WordSenseEditor`: the example being edited (`editedEx`, `editedExIndex`) is now a `linkedSignal` over `sense`, reset when the sense changes; this replaces the former `closeExample()` call in `updateForm()`.
- `WordSenseEditor.onRelatedIdsChange` uses `setFieldFromChild`. **Verified** (test run with set + `markAsDirty` instead): the spec echoing related IDs whose `tag: null` was dropped fails. An echo which differs only by `undefined` properties is instead neutralized also without `setFieldFromChild`, because the draft-sync effect compares JSON (which drops `undefined`) and resets the form; a first version of the spec used such an echo, and did not catch the mutation.
- Monaco editors are bound with `[value]`/`(valueChange)`/`(blur)`, not `[formField]`, so they get no `maxlength`: their "too long" messages still appear while typing. The Markdown previews are `computed()` signals (formerly `valueChanges` debounced by 50 ms).
- `LexWordSensesPartEditor`: settings are loaded with `initSettings()` (on identity), rather than on each data set. **Verified** (test run): the spec "should load the settings for the part role" passes.
- `CADMUS_TEXT_ED_BINDINGS_TOKEN` (`@myrmidon/cadmus-text-ed`) is declared as `InjectionToken<CadmusTextEdServiceOptions>`, while it provides `CadmusTextEdBindings`; `@Inject()` hid this. The editors cast the injected value. Upstream typing bug, not fixed here.

## @myrmidon/cadmus-part-lexicography-word-collocations

Components: `WordCollocLiteralEditor`, `WordCollocTokenEditor`, `WordCollocExampleEditor`, `WordCollocEditor` (manual save sub-editors, nested up to 3 levels: collocation > example > literal), `LexWordCollocationPartEditor` (part editor), `LexWordCollocationsPartFeature` (unchanged).

- Same Enter handling as in word senses. **Verified** (test run with the template's handler in `WordCollocExampleEditor`): "should not save the collocation on Enter in an unchanged example" fails.
- **Verified** (test run with the `previous` check disabled in `WordCollocEditor`): "should keep the typed text when its own save comes back normalized" fails.
- `WordCollocTokenEditor` has no Enter handler: it has no text inputs of its own, and the thesaurus pickers render their inputs inside their own `<form [formRoot]>` (checked in the installed `@myrmidon/cadmus-thesaurus-store` 1.0.1 bundle), which `isImplicitSubmission` excludes.
- `WordCollocLiteralEditor`: the former `tag` (picked entry) and `tagText` (typed) controls are now a single `tag` field (an entry ID or typed text). Its 50 characters limit applies only to typed tags, as before (`maxLength` with a function returning `undefined` when the thesaurus is present).
- `WordCollocExampleEditor`: the former `dirty` signal, `literals` and `editedLiterals` are replaced by the form (`form.literals`, `form().dirty()`); the literal being edited is a `linkedSignal` reset when the example changes (formerly done by an effect). The accept button is now disabled also when the token number is invalid (before, it stayed enabled and its click did nothing): two specs clicking it were changed to check that it is disabled. The token number is now required (an emptied number input was saved as `null`).
- `WordCollocEditor`: `rank` had `min="0"`, which reactive forms turned into a validator: now a `min()` rule. Unlike the sense editor, its token and example sub-editors were not closed when the bound collocation changed; this was kept.
- `LexWordCollocationPartEditor`: the DSL box is a separate signal form (`dslForm`), not affecting the part's dirty state. **Verified** (test run): typing DSL text leaves the part pristine.
- **Believed**: "should not submit an enclosing form on Enter" (example editor inside a host `<form>`) still passes because user-event does not implicitly submit that host form, not because of the editor: with no inner form, the token number input now belongs to the host form, so `isImplicitSubmission` is false and the editor does not consume the Enter. In the app no `<form>` encloses these editors any more. Could be checked in Chrome by embedding the editor in a native form.

## Browser verification (2026-10-17)

**Verified** by driving headless Chrome over CDP (real key events via `Input.dispatchKeyEvent`/`Input.insertText`), against `ng serve` started after `rm -rf .angular/cache`, with all the libraries rebuilt by `pnpm build:libs`, and the backend at `localhost:5248`. 28/28 checks passed:

- the served chunk contains a string present only in the new templates (`nr. required`), so the browser ran the current build;
- one part of each type, seeded through the API with `null` optional values like real data, opens pristine (`isDirty() === false` after 1.5 s, past the child editors' debounces), and renders no `<form>`;
- word senses (part > sense > example): Enter in an unchanged example keeps both editors open; Enter in a changed example accepts only the example; Enter in the sense EID accepts the sense; the part becomes dirty and is not saved by Enter; the save button saves it, and the API returns the edited citation;
- word collocations (part > collocation > example > literal, no `<form>` with all open): the same, level by level; the API returns the edited literal.

Not exercised in the browser: the lemma and word forms nested flows (covered by specs only).

## Reported issues and their follow-up

- **Fixed**: `LexWordCollocationPartEditor.parseDsl` logged unexpected parser exceptions with `console.error(e)`, without telling the user. They are now shown in the DSL error alert, like parse errors. **Verified** (test run with the old code restored): "should show unexpected parser failures and add nothing" fails.
- **Fixed upstream, not yet published**: `CADMUS_TEXT_ED_BINDINGS_TOKEN` is now `InjectionToken<CadmusTextEdBindings>` in `cadmus-bricks-shell-v3/projects/myrmidon/cadmus-text-ed` (uncommitted there; `ng build @myrmidon/cadmus-text-ed` clean). All the known consumers inject it with `@Inject()` typed as `CadmusTextEdBindings`, so the change is type-only. The cast in the word senses editors stays valid, and can be removed once the fixed version is published and installed.
- **Withdrawn, not a bug**: the backend rejecting `null` for `rank`, `isHead` and `isOptional`. The part's JSON schema declares them as `integer` and `boolean`, and the backend docs as `short` (0 = unspecified) and `bool`, so `null` there is invalid data; the frontend omits empty values instead. The `null`s came from the test data I seeded. What remains is that the generic Cadmus API answers such invalid JSON with HTTP 500 rather than 400, which is outside this repository.
