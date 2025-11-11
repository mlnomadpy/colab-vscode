# Nota Editor Webview

This directory contains the TipTap-based webview implementation for the Nota Editor.

## Files

- `NotaEditorProvider.ts` - VS Code custom editor provider that manages the webview lifecycle
- `nota-editor.tsx` - React component with TipTap editor integration
- `nota-editor.css` - Styles for the editor, using VS Code theme variables
- `ExecutableCodeBlock.ts` - Custom TipTap extension for executable code blocks

## Architecture

The Nota Editor uses a webview-based architecture:

1. **Extension Side** (`NotaEditorProvider.ts`):
   - Implements `CustomTextEditorProvider` 
   - Creates and manages webview panels
   - Handles message passing between extension and webview
   - Manages document persistence

2. **Webview Side** (`nota-editor.tsx`):
   - React app with TipTap editor
   - Rich text editing with StarterKit extensions
   - Code blocks with syntax highlighting (lowlight)
   - Sends edits and execution requests to extension

## Message Protocol

### Extension → Webview

- `{ type: "update", content: string }` - Update editor with new document content

### Webview → Extension

- `{ type: "ready" }` - Webview initialized and ready
- `{ type: "edit", content: string }` - Document content changed
- `{ type: "executeCode", code: string, language: string }` - Execute code block

## File Format

`.nota` files are JSON documents containing TipTap's document structure:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Title" }]
    },
    {
      "type": "codeBlock",
      "attrs": { "language": "python" },
      "content": [{ "type": "text", "text": "print('Hello')" }]
    }
  ]
}
```

## Future Enhancements

- [ ] Connect code execution to Colab kernel
- [ ] Render code execution output (text, images, HTML)
- [ ] Add cell execution state indicators
- [ ] Implement .ipynb import/export
- [ ] Add collaborative editing features
- [ ] Support for inline comments and annotations
