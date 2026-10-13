# CareConnect Design System

The shared UI component library for CareConnect — a demo healthcare EMR/portal
application. Built with React + TypeScript, documented with Storybook.

This is a private workspace package inside the [CareConnect monorepo](../../README.md).
It is not published to any registry: the apps in `apps/` resolve it through npm
workspaces, so a component change and the app code that uses it land in the same
commit and the same CI run.

## Usage

`@careconnect/design-system` is already a dependency of `@careconnect/ehr` and
`@careconnect/portal`. To use it from a new workspace, add it to that
workspace's `package.json`:

```json
"dependencies": {
  "@careconnect/design-system": "*"
}
```

Import components from the package root, and the stylesheet once at your app's entry point:

```tsx
import { Button, ToastProvider } from '@careconnect/design-system';
import '@careconnect/design-system/styles';
```

The stylesheet is a separate export rather than a side effect of the JS import, so it is never pulled in twice and you control where it lands in your CSS order. It carries the design tokens (`--cc-*` custom properties), the base reset, and every component's styles — components will render unstyled without it.

```tsx
export function App() {
  return (
    <ToastProvider>
      <Button variant="primary" size="md">Save</Button>
    </ToastProvider>
  );
}
```

The package's own version is exported as a constant, so consumers don't have to hardcode it:

```tsx
import { DESIGN_SYSTEM_VERSION } from '@careconnect/design-system';
```

### Requirements

- **React 19** (`react` and `react-dom` are peer dependencies — the package does not bundle its own copy).
- **An ESM-aware bundler or Node 20+.** The package ships ES modules only; there is no CommonJS entry, so `require()` will not resolve it.

### Exports

| Entry point | Contents |
| --- | --- |
| `@careconnect/design-system` | All components and types (ESM, with `.d.ts` declarations) |
| `@careconnect/design-system/styles` | Design tokens, reset, and component CSS |

The entry points resolve to `dist/`, so the library must be built before the
apps typecheck or bundle. `turbo` handles that ordering — a plain
`npm run build` at the repo root builds this package first.

## Development

Use the Node version in the repo root `.nvmrc` (currently **24**; CI reads the
same file). The floor is 22.22 — the toolchain's `jsdom`/`undici` break on
anything older. That is stricter than the root `engines` field, which
describes what *consumers* need at runtime.

From the repo root:

```bash
nvm use                 # Node version from .nvmrc
npm install             # installs every workspace
npm run storybook       # component playground on :6006
npm run ds:build        # produces packages/design-system/dist/
npm run typecheck       # tsc --noEmit in this package and every other TS workspace
npm test                # unit tests (this package's jsdom suite + the API's)
npm run build-storybook # static Storybook site in storybook-static/
```

The EHR and Portal dev servers (`npm run ehr:dev`, `npm run portal:dev`) load
this package from `dist/`, so run `npm run ds:build` after a component change
to see it in an app — or iterate in Storybook, which reads `src/` directly.

Or scope any of this package's own scripts with `-w @careconnect/design-system`:

```bash
npm run test -w @careconnect/design-system
```

Every story also doubles as a smoke test, run in a real browser. The root
`npm install` fetches that browser for you via its `postinstall` hook, so this
just works on a fresh clone:

```bash
npm run test:stories
```

Multi-step flows and compositions that no single story renders live in
`*.visual.test.tsx` files: plain Vitest tests in the same browser, where
Chromatic snapshots every `takeSnapshot()` and the end of each test. See
[CONTRIBUTING.md](./CONTRIBUTING.md#vitest-visual-tests).

```bash
npm run test:visual
```

`npm run ds:build` emits `dist/index.js`, `dist/careconnect-design-system.css`, and per-component type declarations. React and every runtime dependency are externalized, so consumers resolve a single shared copy from their own tree.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for component and versioning conventions.
