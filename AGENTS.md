AGENTS.md - Repository Agent Guidelines
Build: `npm install`; Types: `npm run build:types` (tsc JSDoc declarations only).
Test all: `npm test` (runs Node builtin test runner on `test/*.test.js`).
Watch tests: `npm run test:watch`.
Single test file: `node --test test/chord.test.js`.
Single test by name: `node --test test/chord.test.js --test-name-pattern 'stringToInterval'`.
No linter configured; keep style consistent; propose ESLint only if requested (do not add unasked).
Modules: ESM (`"type":"module"`); always include `.js` extension in relative imports.
Exports: prefer named exports; update `types/` via build when adding API.
Formatting: 2-space indent, semicolons, trailing commas only where existing pattern; keep lines < 100 chars.
Naming: constants/enums UPPER_SNAKE_CASE; functions & variables camelCase; generators use verbNoun (e.g., generateInversions).
Types: use JSDoc `@typedef`, `@template`, `@param`, `@returns`; keep `//@ts-check` at top of new JS files.
Data structures: prefer immutable operations; clearly document and minimize in-place mutation (only `fretNormalizer` mutates).
Error handling: return `null` for "not found"/parse failures (e.g., `stringToInterval`); throw only for programmer/config errors.
Regular expressions: precompile and store in arrays (see `INTERVAL_ALIASES`); keep anchored `^...$` patterns.
Tests: use `describe` + `test`; assertions via `node:assert/strict`; avoid flaky/time-based tests.
Test additions: place in `test/` with `.test.js`; keep one concern per `describe`; avoid console logs (remove debug prints).
Performance: prefer simple loops over heavy abstractions in hot paths; avoid allocating inside tight generators unnecessarily.
Public API stability: avoid breaking existing exported names; add new exports rather than renaming.
Do not add new tooling/config (linters, formatters, CI) unless explicitly requested.
