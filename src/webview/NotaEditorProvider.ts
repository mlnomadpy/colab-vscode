/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import vscode from "vscode";
import { ColabClient } from "../colab/client";
import { log } from "../common/logging";

/**
 * Provider for the Nota custom editor.
 * Manages webview panels for .nota files and handles communication
 * between the extension and the webview.
 */
export class NotaEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "colab.notaEditor";
  private readonly colabClient: ColabClient;

  constructor(
    private readonly context: vscode.ExtensionContext,
    colabClient: ColabClient,
  ) {
    this.colabClient = colabClient;
    // Will be used for code execution in the future
    void this.colabClient;
  }

  /**
   * Called when the custom editor is opened.
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    // Configure webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "out"),
        vscode.Uri.joinPath(this.context.extensionUri, "resources"),
      ],
    };

    // Set initial HTML content
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Handle messages from the webview
    webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleWebviewMessage(message, document, webviewPanel);
      },
    );

    // Send initial document content to webview
    this.updateWebview(document, webviewPanel);

    // Handle document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          this.updateWebview(document, webviewPanel);
        }
      },
    );

    // Clean up when panel is closed
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  /**
   * Updates the webview with the current document content.
   */
  private updateWebview(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
  ): void {
    panel.webview.postMessage({
      type: "update",
      content: document.getText(),
    });
  }

  /**
   * Handles messages from the webview.
   */
  private async handleWebviewMessage(
    message: { type: string; content?: string; code?: string; language?: string },
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    switch (message.type) {
      case "edit":
        // Update document when user edits in webview
        await this.updateDocument(document, message.content || "");
        break;

      case "executeCode":
        // Execute code block through Colab kernel
        if (message.code) {
          await this.executeCode(message.code, message.language || "python", panel);
        }
        break;

      case "ready":
        // Webview is ready, send initial content
        this.updateWebview(document, panel);
        break;

      default:
        log.warn(`Unknown message type from webview: ${message.type}`);
    }
  }

  /**
   * Updates the document content.
   */
  private async updateDocument(
    document: vscode.TextDocument,
    content: string,
  ): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      content,
    );
    await vscode.workspace.applyEdit(edit);
  }

  /**
   * Executes code through the Colab kernel.
   */
  private async executeCode(
    code: string,
    language: string,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    try {
      log.info(`Executing ${language} code block`);
      
      // TODO: Integrate with Colab kernel execution using this.colabClient
      // For now, send a placeholder response
      panel.webview.postMessage({
        type: "executionResult",
        output: `Execution not yet implemented. Code:\n${code}`,
        success: false,
      });
    } catch (error) {
      log.error("Code execution failed:", error);
      panel.webview.postMessage({
        type: "executionResult",
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
      });
    }
  }

  /**
   * Generates the HTML content for the webview.
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // Get URIs for resources
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "out", "webview", "nota-editor.js"),
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "out", "webview", "nota-editor.css"),
    );

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>Nota Editor</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

/**
 * Generates a random nonce for CSP.
 */
function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
