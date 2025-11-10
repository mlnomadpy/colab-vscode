# Google Colab VS Code Extension

Colab is a hosted Jupyter Notebook service that requires no setup to use and
provides free access to computing resources, including GPUs and TPUs.

This extension now features a **TipTap-based rich text editor** with `.nota` files, providing an enhanced editing experience beyond traditional Jupyter notebooks, while maintaining compatibility with Colab servers.

- 👾 [Bug
  report](https://github.com/googlecolab/colab-vscode/issues/new?template=bug_report.md)
- ✨ [Feature
  request](https://github.com/googlecolab/colab-vscode/issues/new?template=feature_request.md)
- 💬 [Discussions](https://github.com/googlecolab/colab-vscode/discussions)

## Features

### 🎨 Nota Editor (New!)
- **Rich text editing** with TipTap editor
- **Code blocks** with syntax highlighting
- **Executable cells** connected to Colab kernels
- **`.nota` file format** - JSON-based, extensible
- **VS Code theme integration** - Dark/light mode support

### 📓 Jupyter Notebook Support
- Connect to Colab servers for GPU/TPU access
- Execute code in Jupyter notebooks (`.ipynb`)
- Authentication with Google account

## Quick Start

### Using Nota Editor (New!)

1. Install [VS Code](https://code.visualstudio.com).
1. Install the [Colab extension](https://marketplace.visualstudio.com/items?itemName=google.colab).
1. Create a new Nota document:
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run `Colab: New Nota Document`
1. Start editing with rich text formatting!
1. Add code blocks and execute them (coming soon).

### Using Jupyter Notebooks

1. Install [VS Code](https://code.visualstudio.com).
1. Install the [Colab
   extension](https://marketplace.visualstudio.com/items?itemName=google.colab)
   and [Jupyter extension](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter).
1. Open or create a notebook file (`.ipynb`).
1. When prompted, sign in.
1. Click `Select Kernel` > `Colab` > `New Colab Server`.
1. 😎 Enjoy!

![Connecting to a new Colab server and executing a code
cell](./docs/assets/hello-world.gif)

## Commands

Activate the command palette with `Ctrl+Shift+P` or `Cmd+Shift+P` on Mac.

| Command                      | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `Colab: New Nota Document`   | Create a new `.nota` document with TipTap editor  |
| `Colab: Remove server`       | Select an assigned Colab server to remove.        |

## File Formats

### `.nota` Files
JSON-based rich text documents with TipTap structure. Supports:
- Rich formatting (bold, italic, headings, lists)
- Code blocks with syntax highlighting
- Executable code cells
- Extensible for future features

Example:
```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [...] },
    { "type": "codeBlock", "attrs": { "language": "python" }, "content": [...] }
  ]
}
```

### `.ipynb` Files
Standard Jupyter notebook format. Requires [Jupyter extension](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter).

## Documentation

- [TipTap Transformation Guide](./docs/tiptap-transformation.md) - Technical details
- [Webview Architecture](./src/webview/README.md) - Editor implementation
- [Contributing Guide](./docs/contributing.md) - Development setup

## Contributing

Contributions are welcome and appreciated! See the [contributing
guide](./docs/contributing.md) for more info.

## Data and Telemetry

The extension does not collect any client-side usage data within VS Code. See
Colab's [Terms of Service](https://research.google.com/colaboratory/tos_v5.html)
and the [Google Privacy Policy](https://policies.google.com/privacy), which
apply to usage of this extension.

## Security Disclosures

Please see our [security disclosure process](./SECURITY.md). All [security
advisories](https://github.com/googlecolab/colab-vscode/security/advisories) are
managed on GitHub.
