# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A personal collection of web-based developer utilities — "designed to get the job done with minimal clicks". Angular 21 SPA, dark-first, Angular Material (M3), no backend. Everything runs client-side. The one network call is the welcome page's news card ([news.service.ts](src/app/features/welcome/news.service.ts) → Hacker News via Algolia); it is cached for 30 minutes, falls back to the last good list, and the page works without it. Don't add others without a similar fallback.

Before August 2026 this was a vanilla HTML/JS single page; that version is in git history and none of it survives in the working tree.

## Commands

```powershell
npm start        # ng serve on :4200 (runs the snippet codegen first)
npm run build    # production build to dist/ (runs the snippet codegen first)
npm test         # vitest, single run via ng test
npm run snippets # regenerate the snippet index by hand
```

## Architecture

### The utility registry is the single source of truth

[src/app/core/utility-registry.ts](src/app/core/utility-registry.ts) exports `UTILITIES: UtilityDef[]`. That one array drives:

- the routes ([src/app/app.routes.ts](src/app/app.routes.ts) maps over it — routes are never hand-written)
- the sidebar groups ([src/app/layout/sidebar/](src/app/layout/sidebar/))
- the Ctrl+K command palette ([src/app/layout/command-palette/](src/app/layout/command-palette/))
- the welcome page card grid
- the browser title and the page header

**To add a utility**: write a standalone component under `src/app/features/<name>/`, then append one entry to `UTILITIES`. That is the whole checklist. Categories live in [src/app/core/categories.ts](src/app/core/categories.ts); a category with no utilities is simply not rendered.

`scoreUtility()` in the registry does the ranking for both the sidebar filter and the palette — reuse it rather than writing another matcher.

### Shell

[src/app/app.ts](src/app/app.ts) is the shell: sidebar + top bar + `<router-outlet>`. It owns the global Ctrl+K / ⌘K listener and the handset breakpoint (`max-width: 899px`) that turns the sidebar into an overlay drawer. Everything is standalone and `OnPush`, and the app is zoneless (Angular 21 default — no zone.js).

### Shared building blocks

Reuse these rather than rolling new ones:

| Piece | Path | Notes |
|---|---|---|
| `UtilityPage` | [src/app/shared/utility-page/](src/app/shared/utility-page/) | Page header, favorite star, records "recently used". Every feature wraps its content in this and passes `utilityId`. |
| `Panel` | [src/app/shared/panel/](src/app/shared/panel/) | The input/output card. Project actions with `panel-footer`. |
| `CopyButton` | [src/app/shared/copy-button/](src/app/shared/copy-button/) | Icon or labelled variant. Pass a distinct `key` when several sit together. |
| `CodeView`, `StatChips`, `Icon` | `src/app/shared/` | `Icon` wraps the self-hosted Material Symbols font. |
| `_utility-layout.scss` | [src/app/shared/_utility-layout.scss](src/app/shared/_utility-layout.scss) | `two-panel`, `hint`, `shortcut` mixins used by most features. |

`ClipboardService` ([src/app/core/services/clipboard.service.ts](src/app/core/services/clipboard.service.ts)) owns the single "Copied!" timer for the whole app via a `copiedKey` signal — components should not run their own `setTimeout`. `FileDownloadService`, `ThemeService` and `FavoritesService` sit alongside it.

### Feature component conventions

Reactive form → `toSignal(form.valueChanges)` → `computed()` outputs. Output is live; there is no "Generate" button. `Ctrl+Enter` copies the primary output (`@HostListener` on the feature component, sharing a copy key with the visible button so both light up). Validation surfaces as an inline hint or a `mat-error`, never `alert()`.

Pure logic goes in a sibling file (`in-query.ts`, `branch-name.ts`, `codecs.ts`, `timestamp.ts`, `json-format.ts`, `color.ts`/`solver.ts`) with a `.spec.ts` next to it. That is where the tests live — there are no component DOM tests, deliberately.

`color-filter` and `base64-file` are the deliberate exceptions to "compute live on every keystroke", because their work is expensive enough to stall the page. Both debounce the input and expose a `*Pending` signal that drives a spinner. Don't convert either to a plain `computed`.

### base64-file

Format is identified from **magic bytes** ([file-signatures.ts](src/app/features/base64-file/file-signatures.ts)), never from a declared MIME type — the tool warns when a `data:` URI's claim disagrees with the actual bytes.

Browsers can't render TIFF, so [tiff-preview.ts](src/app/features/base64-file/tiff-preview.ts) decodes it to a canvas via `utif2`, **dynamically imported** so its ~34kB only loads when someone pastes a TIFF. Pages are rendered one at a time rather than all at once, so a large multi-page fax doesn't exhaust memory. `utif2` and `pako` are CommonJS and listed in `allowedCommonJsDependencies` in [angular.json](angular.json).

Two things to preserve: base64 conversion is **chunked** (`String.fromCharCode` over a whole multi-MB buffer overflows the argument limit), and the encoded output is **truncated for display** while copy and download use the full string — a 10MB file is ~13MB of base64 and will hang the tab if rendered whole. Object URLs are created and revoked in an `effect` with `onCleanup`.

`slugifyBranchTitle` in [branch-name.ts](src/app/features/branch-name-generator/branch-name.ts) is a verbatim port of the original tool's slug logic and its output is pinned by tests. Don't "improve" it casually — branch names already in use depend on it.

### Ported third-party algorithm: the colour-filter solver

[src/app/features/color-filter/](src/app/features/color-filter/) ports the SPSA solver from [angel-rs/css-color-filter-generator](https://github.com/angel-rs/css-color-filter-generator) (MIT), originally [this Stack Overflow answer](https://stackoverflow.com/a/43960991) (CC BY-SA). Attribution lives in the file headers; keep it there.

Every constant in `solver.ts` is tuned, and `Color.hsl()` deliberately scales hue by `* 100` rather than `* 360` because that is how the loss function weights it. Changing any of these changes every result. Because the search is stochastic, the specs assert a **property** — replaying the emitted chain through the same filter maths must reproduce the target colour — rather than exact output values. Keep it that way; exact-value assertions here would be flaky.

### Code Blocks snippets

Snippets are one JSON file each in [src/app/features/code-blocks/snippets/](src/app/features/code-blocks/snippets/), shaped `{ title, language, code, tags? }` with `\n` for newlines.

**Adding one is just dropping a file in that folder.** [scripts/generate-snippet-index.mjs](scripts/generate-snippet-index.mjs) scans the folder, validates the required fields, and writes `snippets.index.ts` with static imports (the `id` comes from the filename). It runs on `prestart`/`prebuild`; the generated file is committed so a bare `ng build` works. Never edit `snippets.index.ts` by hand.

### Theming

Material 3 via `mat.theme()` in [src/styles.scss](src/styles.scss), which emits tokens that follow `color-scheme`. `ThemeService` toggles `.theme-dark` / `.theme-light` on `<html>` and persists to localStorage; an inline script in [src/index.html](src/index.html) applies it before first paint to avoid a flash.

Use `var(--mat-sys-*)` system tokens for colors, plus the app-level `--wu-*` tokens (radius, gap, mono font, code colors) defined at the top of `styles.scss`. Don't hardcode hex values — the old stylesheet did, and removing that is exactly what this rewrite was for.

Roboto (latin subset only) is self-hosted through the `styles` array in [angular.json](angular.json). There are no CDN dependencies for fonts; the app works offline.

### Icon font

The full Material Symbols font is ~3.9 MB, so the app ships a **generated subset** instead: [src/assets/fonts/material-symbols-subset.woff2](src/assets/fonts/material-symbols-subset.woff2) (~10 kB), declared by the `@font-face` in [src/styles.scss](src/styles.scss). [scripts/build-icon-font.mjs](scripts/build-icon-font.mjs) builds it from every quoted word in `src/**/*.{ts,html}` that the font turns into an icon, and runs on `prestart`/`prebuild` (or `npm run icons`). The output is committed.

- **Adding an icon needs no extra step** - use it in a template or registry entry and the next `npm start`/`npm run build` picks it up. Restart `ng serve` after adding one.
- A misspelled icon in `icon: '...'` or `<app-icon name="...">` fails the script rather than rendering as plain text.
- Axes are pinned to FILL 0 / wght 400 / GRAD 0 / opsz 24, so the `filled` variant does not exist. Don't reintroduce `font-variation-settings` for it without un-pinning in the script.
- Never name an icon dynamically (`'arrow_' + dir`): the scan only sees whole quoted words.

### Deployment

Hosted on Vercel. [vercel.json](vercel.json) gives hashed assets a one-year `immutable` cache and rewrites unknown paths to `index.html` for deep links. The project's Output Directory must be `dist/work-utilities/browser` and its build command `npm run build` (so the snippet and icon generators run).

Routes are already lazy (`loadComponent` per registry entry), and the command palette's dialog is imported on first Ctrl+K - keep `MatDialog`/`CommandPalette` out of static imports in the shell.
