/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "lowlight/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import { ExecutableCodeBlock } from "./ExecutableCodeBlock";

// Register common languages
lowlight.registerLanguage("javascript", javascript);
lowlight.registerLanguage("python", python);
lowlight.registerLanguage("typescript", typescript);

// VS Code API type
declare const acquireVsCodeApi: () => {
  postMessage: (message: unknown) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
};

const vscode = acquireVsCodeApi();

/**
 * Main Nota Editor component using TipTap.
 */
function NotaEditor() {
  const [isReady, setIsReady] = useState(false);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block, use our custom one
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      ExecutableCodeBlock,
    ],
    content: "",
    onUpdate: ({ editor }) => {
      // Send content updates back to the extension
      const json = editor.getJSON();
      vscode.postMessage({
        type: "edit",
        content: JSON.stringify(json),
      });
    },
    editorProps: {
      attributes: {
        class: "nota-editor-content",
      },
    },
  });

  // Handle messages from the extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case "update":
          // Update editor content when document changes
          try {
            const parsedContent = JSON.parse(message.content || "{}");
            if (editor && !editor.isDestroyed) {
              editor.commands.setContent(parsedContent);
            }
          } catch (error) {
            console.error("Failed to parse content:", error);
            // If parsing fails, initialize with empty document
            if (editor && !editor.isDestroyed) {
              editor.commands.setContent({
                type: "doc",
                content: [
                  {
                    type: "heading",
                    attrs: { level: 1 },
                    content: [{ type: "text", text: "New Nota Document" }],
                  },
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Start writing or insert a code block to execute code...",
                      },
                    ],
                  },
                ],
              });
            }
          }
          break;

        case "executionResult":
          // Handle code execution results
          console.log("Execution result:", message);
          // TODO: Update the specific code block with results
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [editor]);

  // Notify extension when webview is ready
  useEffect(() => {
    if (editor && !isReady) {
      setIsReady(true);
      vscode.postMessage({ type: "ready" });
    }
  }, [editor, isReady]);

  // Execute code from a code block
  const executeCode = useCallback(
    (code: string, language: string) => {
      vscode.postMessage({
        type: "executeCode",
        code,
        language,
      });
    },
    [],
  );

  if (!editor) {
    return <div className="loading">Loading editor...</div>;
  }

  return (
    <div className="nota-editor">
      <MenuBar editor={editor} onExecuteCode={executeCode} />
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Menu bar with formatting controls.
 */
function MenuBar({
  editor,
  onExecuteCode,
}: {
  editor: Editor;
  onExecuteCode: (code: string, language: string) => void;
}) {
  if (!editor) {
    return null;
  }

  return (
    <div className="menu-bar">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive("bold") ? "is-active" : ""}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive("italic") ? "is-active" : ""}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""}
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
        title="Heading 2"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive("bulletList") ? "is-active" : ""}
        title="Bullet List"
      >
        • List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive("codeBlock") ? "is-active" : ""}
        title="Code Block"
      >
        &lt;/&gt; Code
      </button>
      <span className="separator">|</span>
      <button
        onClick={() => {
          // TODO: Get current code block content and execute
          const { from } = editor.state.selection;
          const node = editor.state.doc.nodeAt(from);
          if (node?.type.name === "codeBlock") {
            const code = node.textContent;
            const language = node.attrs.language || "python";
            onExecuteCode(code, language);
          }
        }}
        title="Execute Code Block"
      >
        ▶ Run
      </button>
    </div>
  );
}

// Initialize the React app
const container = document.getElementById("root");
if (container) {
  console.log('Root container found, initializing React...');
  try {
    const root = createRoot(container);
    root.render(<NotaEditor />);
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Failed to render React app:', error);
    container.innerHTML = `<div style="padding: 20px; color: red;">
      <h1>Error initializing editor</h1>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>`;
  }
} else {
  console.error('Root container not found!');
  document.body.innerHTML = `<div style="padding: 20px; color: red;">
    <h1>Error: Root container not found</h1>
    <p>The editor could not initialize because the root element is missing.</p>
  </div>`;
}
