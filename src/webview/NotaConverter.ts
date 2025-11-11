/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Jupyter notebook cell interface
 */
interface JupyterCell {
  cell_type: "code" | "markdown" | "raw";
  metadata: Record<string, any>;
  source: string | string[];
  execution_count?: number | null;
  outputs?: any[];
}

/**
 * Jupyter notebook interface
 */
export interface JupyterNotebook {
  cells: JupyterCell[];
  metadata: Record<string, any>;
  nbformat: number;
  nbformat_minor: number;
}

/**
 * Nota document interface (TipTap format)
 */
export interface NotaDocument {
  type: "doc";
  content: NotaNode[];
}

/**
 * Nota node interface
 */
export interface NotaNode {
  type: string;
  attrs?: Record<string, any>;
  content?: NotaNode[];
  text?: string;
  marks?: any[];
}

/**
 * Converts between .ipynb (Jupyter notebook) and .nota (TipTap) formats
 */
export class NotaConverter {
  /**
   * Converts a Jupyter notebook to Nota format
   * @param ipynb - Jupyter notebook object
   * @returns Nota document
   */
  ipynbToNota(ipynb: JupyterNotebook): NotaDocument {
    const content: NotaNode[] = [];

    for (const cell of ipynb.cells) {
      const cellNodes = this.convertJupyterCell(cell);
      content.push(...cellNodes);
    }

    return {
      type: "doc",
      content,
    };
  }

  /**
   * Converts a Nota document to Jupyter notebook format
   * @param nota - Nota document
   * @returns Jupyter notebook object
   */
  notaToIpynb(nota: NotaDocument): JupyterNotebook {
    const cells: JupyterCell[] = [];

    for (const node of nota.content) {
      const cell = this.convertNotaNode(node);
      if (cell) {
        cells.push(cell);
      }
    }

    return {
      cells,
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5,
    };
  }

  /**
   * Converts a Jupyter cell to Nota nodes
   */
  private convertJupyterCell(cell: JupyterCell): NotaNode[] {
    const source = Array.isArray(cell.source) ? cell.source.join("") : cell.source;

    if (cell.cell_type === "code") {
      return [
        {
          type: "codeBlock",
          attrs: { language: "python" },
          content: [{ type: "text", text: source }],
        },
      ];
    } else if (cell.cell_type === "markdown") {
      return this.parseMarkdownToNota(source);
    }

    // Default to paragraph for other types
    return [
      {
        type: "paragraph",
        content: [{ type: "text", text: source }],
      },
    ];
  }

  /**
   * Parses markdown text to Nota nodes
   */
  private parseMarkdownToNota(markdown: string): NotaNode[] {
    const nodes: NotaNode[] = [];
    const lines = markdown.split("\n");

    for (const line of lines) {
      if (line.trim().length === 0) {
        continue;
      }

      // Check for headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        nodes.push({
          type: "heading",
          attrs: { level },
          content: [{ type: "text", text }],
        });
        continue;
      }

      // Default to paragraph
      nodes.push({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      });
    }

    return nodes.length > 0 ? nodes : [{ type: "paragraph", content: [] }];
  }

  /**
   * Converts a Nota node to Jupyter cell
   */
  private convertNotaNode(node: NotaNode): JupyterCell | null {
    if (node.type === "codeBlock") {
      const code = this.extractText(node);
      return {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        source: [code],
        outputs: [],
      };
    }

    // Convert other nodes to markdown
    const markdown = this.notaNodeToMarkdown(node);
    if (markdown) {
      return {
        cell_type: "markdown",
        metadata: {},
        source: [markdown],
      };
    }

    return null;
  }

  /**
   * Converts a Nota node to markdown text
   */
  private notaNodeToMarkdown(node: NotaNode): string {
    if (node.type === "heading") {
      const level = node.attrs?.level || 1;
      const text = this.extractText(node);
      return "#".repeat(level) + " " + text;
    }

    if (node.type === "paragraph") {
      return this.extractText(node);
    }

    return this.extractText(node);
  }

  /**
   * Extracts text content from a Nota node
   */
  private extractText(node: NotaNode): string {
    if (node.text) {
      return node.text;
    }

    if (node.content) {
      return node.content.map((child) => this.extractText(child)).join("");
    }

    return "";
  }
}
