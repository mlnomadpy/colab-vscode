/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Custom TipTap extension for executable code blocks.
 * Extends the basic code block with execution capabilities.
 */
export const ExecutableCodeBlock = Node.create({
  name: "executableCodeBlock",

  group: "block",

  content: "text*",

  marks: "",

  code: true,

  defining: true,

  addAttributes() {
    return {
      language: {
        default: "python",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-language"),
        renderHTML: (attributes: { language?: string }) => {
          if (!attributes.language) {
            return {};
          }
          return { "data-language": attributes.language };
        },
      },
      output: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-output"),
        renderHTML: (attributes: { output?: string | null }) => {
          if (!attributes.output) {
            return {};
          }
          return { "data-output": attributes.output };
        },
      },
      status: {
        default: "idle", // idle, running, success, error
        parseHTML: (element: HTMLElement) => element.getAttribute("data-status"),
        renderHTML: (attributes: { status?: string }) => {
          if (!attributes.status) {
            return {};
          }
          return { "data-status": attributes.status };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "pre[data-type='executable-code-block']",
        preserveWhitespace: "full",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      {
        "data-type": "executable-code-block",
      },
    );

    return [
      "div",
      { class: "executable-code-block-wrapper" },
      [
        "pre",
        attrs,
        ["code", {}, 0],
      ],
      node.attrs.output
        ? ["div", { class: "code-output" }, node.attrs.output]
        : ["div", { class: "code-output-placeholder" }, "Run to see output"],
    ];
  },
});

