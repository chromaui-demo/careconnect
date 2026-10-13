# Figma ↔ Storybook bridge

How the design system's code and its Figma library stay in sync, in both
directions. Storybook (published through Chromatic) is the source of truth for
components; `tokens.css` is the source of truth for design tokens. Figma is
generated from them and linked back to them — nothing is drawn twice.

```
tokens.css ─ npm run tokens:export ─▶ src/figma/tokens.json ─ Figma variable import ─▶ Figma Variables
*.stories.tsx ─ Chromatic (CI) ─▶ main--<app>.chromatic.com ─ story.to.design ─▶ Figma components
Figma components ─ Storybook Connect plugin ─▶ live story embedded in the Figma sidebar
Figma node URLs ─ src/figma/links.json ─▶ Storybook "Design" tab (addon-designs)
```

## What is wired in the repo

| Piece | Where | Purpose |
| --- | --- | --- |
| Chromatic publish + visual review | [.github/workflows/chromatic.yml](../.github/workflows/chromatic.yml), [chromatic.config.json](../packages/design-system/chromatic.config.json) | Every design-system PR publishes Storybook and posts a visual diff; `main` is the auto-accepted baseline. The `main` permalink is what the Figma plugins read. |
| Storybook Design tab | `@storybook/addon-designs` in [.storybook/main.ts](../packages/design-system/.storybook/main.ts) | Shows the matching Figma frame next to every story. |
| Figma link registry | [src/figma/links.json](../packages/design-system/src/figma/links.json), [src/figma/links.ts](../packages/design-system/src/figma/links.ts) | One file mapping story title → Figma node URL. Every `*.stories.tsx` meta calls `figmaDesign('<title>')`; nothing else to edit per component. |
| Design tokens export | [scripts/export-figma-tokens.mjs](../packages/design-system/scripts/export-figma-tokens.mjs) → [src/figma/tokens.json](../packages/design-system/src/figma/tokens.json) | W3C DTCG tokens generated from `tokens.css`. `npm test` fails if the committed JSON is stale. |
| Token sheets | [src/Foundations.stories.tsx](../packages/design-system/src/Foundations.stories.tsx) | `Foundations/Tokens` — colors, type, spacing, radius, elevation rendered from the JSON. Reference page for designers, import frames for Figma, Chromatic snapshot for token changes. |

Published Storybook (branch permalinks): `https://main--6acbb93e85153a14d4e5b1cc.chromatic.com`
(replace `main` with any branch name). Build history:
`https://www.chromatic.com/builds?appId=6acbb93e85153a14d4e5b1cc`.

## One-time Figma setup (~30–45 minutes, done in Figma)

Figma's REST API cannot create design nodes, so the code → Figma step is a
plugin run inside Figma. Nothing here needs a code change.

### 1. Create the library file

Create a Figma file **CareConnect Design System** in the team space and mark it
as a shared library (Assets → Team library → Publish) once steps 2–3 are done.

### 2. Import the design tokens as variables

1. Regenerate the export if `tokens.css` changed since the last commit:
   `npm run tokens:export --workspace=@careconnect/design-system`.
2. In Figma open **Local variables** → collection menu → **Import from JSON**
   and choose `packages/design-system/src/figma/tokens.json`. Figma's native
   DTCG import is rolling out through 2026; if the menu item is missing, the
   community plugins *Variables JSON Import* or *Tokens Studio* read the same
   file.
3. Variables land as `color/primary`, `space/4`, `radius/md`, `font/size/sm`,
   `shadow/md`, … — the same names as the `--cc-*` CSS variables minus the
   prefix, so a designer and a developer can name the same token. Each token
   carries `$extensions["com.careconnect"].cssVariable` for lookup.
4. If an importer rejects the `{ value, unit }` dimension objects (pre-2025
   DTCG format), export with `--legacy-dimensions` for plain `"16px"` strings.

Review the **Foundations/Tokens → Typography** and **Spacing** sheets before
importing: the export is faithful to `tokens.css`, so anything odd in the CSS
becomes a Figma variable.

### 3. Generate the components with story.to.design

[story.to.design](https://story.to.design/) (Figma community plugin by
‹div›RIOTS) reads a published Storybook and creates native Figma components,
one **component per story title** and one **variant per story**, with
component properties derived from the args.

1. Install the plugin in Figma and open it inside the library file.
2. Paste the Storybook URL:
   `https://main--6acbb93e85153a14d4e5b1cc.chromatic.com`.
   Chromatic Storybooks are private to the project; use the plugin's private
   Storybook option and sign in with the Chromatic account.
3. Select what to import. Recommended first pass:
   - **Components/**, **Layout/**, **Clinical/** — all stories. Skip the
     `All Variants` / overview stories where a component has them; they are
     documentation grids, not variants, and would become oversized frames.
   - **Foundations/Tokens** — import as plain frames on a *Foundations* page.
   - **Charts/** — optional; import as frames, not as variant components.
4. Click **Import**. The plugin names each Figma component after the story
   title (`Components/Button`), which is exactly the key used in
   `src/figma/links.json`.
5. Publish the library.

From now on the plugin watches the Storybook: after a merge to `main` it flags
the components whose stories changed and updates them in one click.

### 4. Link Figma components back to their stories (Storybook Connect)

Chromatic's [Storybook Connect](https://www.chromatic.com/docs/figma-plugin/)
plugin puts the live story in the Figma sidebar of each component, so a
designer sees the running component (and the last Chromatic build) without
leaving Figma.

1. Install the plugin, sign in with the Chromatic account.
2. Select a Figma component, open the plugin, and paste the story URL copied
   from the Chromatic-published Storybook (e.g. the `Primary` story of
   Button). Repeat per component; instances inherit the link.
3. The link follows the **branch**, so it keeps pointing at the newest `main`
   build as the Storybook URL changes.

### 5. Fill in the link registry so Storybook shows the designs

In Figma, right-click each generated component → **Copy link**. Paste the URLs
into `packages/design-system/src/figma/links.json`:

```json
{
  "file": "https://www.figma.com/design/<fileKey>/CareConnect-Design-System",
  "components": {
    "Components/Button": "https://www.figma.com/design/<fileKey>/CareConnect-Design-System?node-id=12-345",
    ...
  }
}
```

Open a PR. Storybook's **Design** tab now embeds the Figma frame for every
story of that component; components without a node URL fall back to a link to
the library file. The unit tests check every entry is a `figma.com` URL.

## Day-to-day workflow

**Code changes first (most common):** open a PR touching the design system →
Chromatic posts the visual diff → merge → `main` auto-accepts the baseline →
story.to.design notifies the designer that components changed → one-click
update in Figma → publish the library.

**Token change:** edit `src/styles/tokens.css` → `npm run tokens:export` (the
`tokens.json` unit test fails until you do) → Chromatic shows the diff on the
Foundations sheets → after merge, re-import `tokens.json` in Figma; variables
are matched by name and updated in place.

**Design changes first:** the designer updates the Figma component → the
developer opens the story, reads the Design tab (Figma frame with Inspect) →
implements → Chromatic diff → the designer reviews the build in Chromatic
(add them as a reviewer on the build) → merge → story.to.design re-syncs the
Figma component from the now-canonical code.

**New component:** add the story file with a `title` (the codemod convention
is `parameters: { design: figmaDesign('<title>') }` in the meta), add the same
title to `links.json` with an empty value, merge, import it with
story.to.design, then paste the node URL.

## Optional: Figma Code Connect (Organization / Enterprise plans)

[Code Connect](https://www.figma.com/code-connect-docs/) shows the real React
usage in Figma Dev Mode instead of auto-generated CSS. It maps a Figma
component to a code snippet with a `*.figma.tsx` file per component:

```tsx
// packages/design-system/src/components/Button/Button.figma.tsx
import figma from '@figma/code-connect';
import { Button } from './Button';

figma.connect(Button, 'https://www.figma.com/design/<fileKey>/...?node-id=12-345', {
  props: {
    variant: figma.enum('Variant', { Primary: 'primary', Secondary: 'secondary', Ghost: 'ghost', Danger: 'danger', Accent: 'accent' }),
    size: figma.enum('Size', { sm: 'sm', md: 'md', lg: 'lg' }),
    disabled: figma.boolean('Disabled'),
    children: figma.string('Label'),
  },
  example: ({ variant, size, disabled, children }) => (
    <Button variant={variant} size={size} disabled={disabled}>{children}</Button>
  ),
});
```

Setup once the library exists: `npm i -D @figma/code-connect` in the design
system, a `figma.config.json` with `"include": ["src/components/**/*.figma.tsx"]`,
a `FIGMA_ACCESS_TOKEN`, then `npx figma connect publish`. The variant/property
names come from what story.to.design generated in step 3.
