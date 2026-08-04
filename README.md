# Dev Utilities

A no-frills collection of web-based developer utilities designed to get the job done with minimal clicks.

Angular 21 + Angular Material, dark by default, entirely client-side.

## Running

```powershell
npm install
npm start        # http://localhost:4200
```

```powershell
npm run build    # production build to dist/work-utilities
npm test         # unit tests
```

## Utilities

| | |
|---|---|
| **SQL IN Statement Generator** | Paste a list of IDs, get a `SELECT ... WHERE ... IN (...)` query. Quote style, dedupe, copy or download as `.sql`. |
| **GUID Generator** | v4 GUIDs in bulk, with casing, brace and hyphen options. |
| **Branch Name Generator** | Card number + title → a clean git branch name, plus the `git checkout -b` command. |
| **JSON Formatter** | Pretty-print, minify and validate, with line/column error positions. |
| **Encode / Decode** | Base64 (standard and URL-safe), URL, and HTML entities, both directions. |
| **Timestamp Converter** | Unix epoch ↔ ISO 8601 ↔ UTC ↔ local, with a relative label. |
| **Frequently Used Code Blocks** | Your saved snippets, searchable and one click from the clipboard. |

## Getting around

- **Ctrl+K** (⌘K on Mac) opens a command palette — type a few letters, hit Enter.
- Every utility has its own URL (`/sql/in-generator`, `/general/branch-name`, …), so bookmark the ones you use.
- **Ctrl+Enter** copies the current output.
- Star a utility to pin it to the top of the sidebar.

## Adding a snippet

Drop a JSON file into `src/app/features/code-blocks/snippets/`:

```json
{
  "title": "User Role",
  "language": "SQL",
  "code": "SELECT *\nFROM UserRole;",
  "tags": ["users"]
}
```

The filename becomes the snippet id. There's no registry to update — the index is generated on `npm start` / `npm run build`.
