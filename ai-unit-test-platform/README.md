# AI Unit Testing Platform -- Frontend (synced with agent v0.2.0, Jest-by-default)

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Requires the agent (`ai-unit-test-agent`) running separately on port 4500.

## What changed in this version

- The `/analyze` page now shows a clear amber banner when Jest was auto-scaffolded into a
  project that had no test framework, with a one-click **Copy** button for the exact
  `npm install --save-dev ...` command you need to run before generating/running tests.
- "Test Framework" badge shows `jest (needs install)` vs just `jest` so you always know
  whether the scaffold step already has the packages installed or not.
- Config files like `vite.config.js`, `eslint.config.js`, `tailwind.config.js`,
  `postcss.config.js` no longer appear in the "select a file" list -- only real source files do.

## Flow

1. `/` -- enter path or repo URL -> `/api/analyze` -> agent detects stack, auto-scaffolds Jest
   if nothing is installed.
2. `/analyze` -- if scaffolded, copy+run the install command shown in the amber banner first.
   Then pick a source file, click Generate Tests (uses Jest by default).
3. Review/save generated tests (diff-confirmation modal if overwriting).
4. Run Tests -> real Jest results on `/results`.
