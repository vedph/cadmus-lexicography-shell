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

- 2025-11-24:
  - ⚠️ upgraded to Angular 21.
  - migrated to `pnpm`.
- 2025-11-18: added LID generation.

### 0.0.1

- 2025-11-01:
  - updated Angular and packages.
  - published libraries.
