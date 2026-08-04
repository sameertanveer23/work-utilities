# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static, dependency-free collection of web-based developer utilities ("designed to get the job done with minimal clicks"). There is no build step, no package manager, and no test suite — everything is plain HTML/CSS/vanilla JS with Bootstrap 5, Font Awesome, and DevIcons loaded from CDNs.

## Running

Open [index.html](index.html) in a browser. One caveat: the Code Blocks utility `fetch`es JSON files from disk, which browsers block under `file://`. To exercise that feature, serve the directory over HTTP:

```powershell
python -m http.server 8000     # then browse to http://localhost:8000
```

## Architecture

Single-page app in [index.html](index.html) + [script.js](script.js), no framework and no router:

- The sidebar lists **categories** (SQL, .NET, Angular, General, Code Blocks); `toggleCategory()` is an accordion that closes all other categories.
- Each utility is a `<div class="utility-view" id="...">` inside `.content-area`. `switchUtility(id, element)` swaps the `.active` class between views — that is the entire navigation mechanism.
- `switchUtility` also updates the top-bar title from the hardcoded `utilityNames` map in [script.js:43](script.js#L43). **Adding a utility means touching three places**: a sidebar `.utility-item` with an `onclick="switchUtility('new-id', this)"`, a matching `.utility-view` div, and an entry in `utilityNames`.
- All styling for the SPA lives in the `<style>` block of [index.html](index.html) — there is no separate CSS file.
- Handlers are wired with inline `onclick` attributes, so utility functions must be top-level in [script.js](script.js) (global scope). Follow that pattern rather than introducing modules or listeners.

### Code Blocks utility

Snippets are stored one-per-file as JSON in [utilities/code-blocks/](utilities/code-blocks/) and fetched lazily on first view. To add one, create the JSON file (`{ "title", "language", "code" }`, kebab-case filename, `\n` for newlines) **and** append the filename to the `codeBlockFiles` array at [script.js:57](script.js#L57) — files are not auto-discovered. See [utilities/code-blocks/README.md](utilities/code-blocks/README.md). Rendered code is HTML-escaped via `escapeHtml()`; note the surrounding card markup is built by string interpolation of `block.title`/`block.language`, which are not escaped.

### Legacy / orphaned files

[sql_in_generator.html](sql_in_generator.html) is a standalone earlier version of the IN-generator, superseded by the `in-generator` view in the SPA. [utilities/angular/index.html](utilities/angular/index.html), [utilities/general/index.html](utilities/general/index.html), and [utilities/net/index.html](utilities/net/index.html) are "Coming Soon" placeholder pages with their own dark-theme styling; nothing in the SPA links to them (the sidebar shows inert "Coming Soon" items instead). Don't assume these are wired in — new work belongs in the SPA unless asked otherwise.
