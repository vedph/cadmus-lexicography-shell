# CadmusLexicographyShell

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.5.

- [models](https://github.com/vedph/cadmus-lexicography-shell)
- [API](https://github.com/vedph/cadmus-lexicography-api)

## Docker

🐋 Quick Docker image build:

1. `pnpm run build-lib`
2. update version in `env.js` and `ng build`
3. `docker build . -t vedph2020/cadmus-lexicography-app:0.0.1 -t vedph2020/cadmus-lexicography-app:latest` (replace with the current version).

## History

### 0.1.0

- 2026-03-01:
  - updated Angular and packages.
  - ⚠️ migrated to `OnPush`.

### 0.0.9

- 2026-02-05:
  - updated Angular and packages.
  - added `lookupProviderOptions` wherever lookup components are used, getting data from settings and changing the corresponding part thesauri to be role-dependent.
- 2026-01-28: fixes to collocations.

### 0.0.8

- 2026-01-28:
  - UI fixes.
  - renamed `WordCollocationExample` into `WordCollocationExampleToken`.

### 0.0.7

- 2026-01-27:
  - updated Angular and packages.
  - added `asserted-id-features` thesaurus to all parts using asserted composite IDs (i.e. `@myrmidon/cadmus-part-lexicography-word-senses`).
  - various fixes.
- 2026-01-19: updated Angular and packages adding `@myrmidon/cadmus-thesaurus-store` (TODO: check usage of asserted composite IDs and add new thesaurus).
- 2025-11-28: added tag to word collocation.
- 2025-11-24:
  - ⚠️ upgraded to Angular 21.
  - migrated to `pnpm`.
- 2025-11-18: added LID generation.

### 0.0.1

- 2025-11-01:
  - updated Angular and packages.
  - published libraries.
