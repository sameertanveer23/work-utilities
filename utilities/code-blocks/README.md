# Code Blocks

This folder contains frequently used code snippets that are displayed in the "Frequently Used Code Blocks" utility.

## How to Add New Code Blocks

1. **Create a new JSON file** in this directory with a descriptive name (e.g., `my-code-snippet.json`)

2. **Use this format:**

```json
{
  "title": "Your Code Block Title",
  "language": "C#",
  "code": "Your code here...\nWith newlines as needed"
}
```

3. **Add the filename** to the `codeBlockFiles` array in `index.html`:

```javascript
const codeBlockFiles = [
  "castle-windsor-di.json",
  "sql-left-join.json",
  "my-code-snippet.json", // Add your file here
];
```

4. **That's it!** Refresh the page and your code block will appear in the grid.

## Example

**File: `my-helper-function.json`**

```json
{
  "title": "My Helper Function",
  "language": "TypeScript",
  "code": "export function formatDate(date: Date): string {\n  return date.toLocaleDateString('en-US');\n}"
}
```

## Tips

- Use `\n` for newlines in the code string
- Supported languages: C#, SQL, TypeScript, JavaScript, and any language name you want
- The language appears as a badge on the card
- Code is automatically HTML-escaped for safety
- Maximum 6-7 cards fit on a desktop view

## File Naming

Use kebab-case for filenames to keep things organized:

- `castle-windsor-di.json` ✓
- `sql_left_join.json` ✗
- `angularHttpInterceptor.json` ✗
