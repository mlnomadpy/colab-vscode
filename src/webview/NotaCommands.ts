/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotaConverter, JupyterNotebook, NotaDocument } from "./NotaConverter";

/**
 * Commands for working with Nota documents and Jupyter notebooks
 */
export class NotaCommands {
  constructor(private readonly converter: NotaConverter) {}

  /**
   * Exports a Nota document to Jupyter notebook format
   * @param notaContent - The Nota document to export
   * @returns Jupyter notebook object
   */
  async exportToIpynb(notaContent: NotaDocument): Promise<JupyterNotebook> {
    return this.converter.notaToIpynb(notaContent);
  }

  /**
   * Imports a Jupyter notebook to Nota format
   * @param ipynbContent - The Jupyter notebook to import
   * @returns Nota document
   */
  async importFromIpynb(ipynbContent: JupyterNotebook): Promise<NotaDocument> {
    return this.converter.ipynbToNota(ipynbContent);
  }

  /**
   * Gets the file path from a VS Code URI
   * @param uri - VS Code URI object
   * @returns File path or null
   */
  getNotaFilePath(uri: { fsPath: string } | null): string | null {
    if (!uri) {
      return null;
    }
    return uri.fsPath;
  }

  /**
   * Generates a .ipynb filename from a .nota filename
   * @param notaPath - Path to the .nota file
   * @returns Suggested .ipynb filename
   */
  generateIpynbFilename(notaPath: string | null): string {
    if (!notaPath) {
      return "notebook.ipynb";
    }

    const lastSlash = notaPath.lastIndexOf("/");
    const lastBackslash = notaPath.lastIndexOf("\\");
    const lastSeparator = Math.max(lastSlash, lastBackslash);

    const filename =
      lastSeparator >= 0 ? notaPath.substring(lastSeparator + 1) : notaPath;

    // Replace .nota extension with .ipynb
    if (filename.endsWith(".nota")) {
      return filename.substring(0, filename.length - 5) + ".ipynb";
    }

    return filename + ".ipynb";
  }
}
