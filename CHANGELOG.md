# Changelog

## Unreleased

### Infrastructure

- replaced the libraries build script (`pnpm run build:libs`) with `scripts/build-libs.mjs`, which builds the libraries in dependency order (derived from both their manifests and their actual imports) after checking that no local library is shadowed by a copy in `node_modules` (`scripts/check-local-libs.js`, also available as `pnpm run check-libs`). Pass library names to rebuild only them and everything depending on them.
- migrated tests from Karma/Jasmine to Vitest via the Angular `@angular/build:unit-test` builder (jsdom environment), with Angular Testing Library (`@testing-library/angular`, `@testing-library/user-event`) and `@testing-library/jest-dom` matchers (registered in `test-setup.ts`). Removed all the Karma and Jasmine packages. Library test targets use the app's zoneless `testing` build configuration. Added `test:<lib>` and `test:libs` scripts.
- pnpm settings moved from `package.json` (no longer read by pnpm 12) into `pnpm-workspace.yaml`; added an override forcing `@jridgewell/sourcemap-codec` to `^1.6.0`, required by `@angular/compiler-cli` 22.2 but not declared by it; set `extendNodePath: false`, because the `NODE_PATH` set by pnpm's command shims made the test builder detect a `zone.js` that Vite could not then resolve.
