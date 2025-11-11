/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { expect } from "chai";
import * as sinon from "sinon";
import { NotaConverter } from "./NotaConverter.js";

describe("NotaCommands", () => {
  let NotaCommands: any;
  let notaConverter: NotaConverter;

  beforeEach(async () => {
    notaConverter = new NotaConverter();
    const module = await import("./NotaCommands.js");
    NotaCommands = module.NotaCommands;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("exportToIpynb", () => {
    it("should convert nota content to ipynb format", async () => {
      const commands = new NotaCommands(notaConverter);
      const notaContent = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Test" }],
          },
        ],
      };

      const result = await commands.exportToIpynb(notaContent);

      expect(result).to.exist;
      expect(result.cells).to.be.an("array");
      expect(result.nbformat).to.equal(4);
    });

    it("should handle empty nota documents", async () => {
      const commands = new NotaCommands(notaConverter);
      const notaContent = {
        type: "doc",
        content: [],
      };

      const result = await commands.exportToIpynb(notaContent);

      expect(result).to.exist;
      expect(result.cells).to.be.an("array");
      expect(result.cells.length).to.equal(0);
    });

    it("should preserve code blocks in export", async () => {
      const commands = new NotaCommands(notaConverter);
      const notaContent = {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: { language: "python" },
            content: [{ type: "text", text: "print('hello')" }],
          },
        ],
      };

      const result = await commands.exportToIpynb(notaContent);

      expect(result.cells.length).to.be.greaterThan(0);
      expect(result.cells[0].cell_type).to.equal("code");
    });
  });

  describe("importFromIpynb", () => {
    it("should convert ipynb to nota format", async () => {
      const commands = new NotaCommands(notaConverter);
      const ipynbContent = {
        cells: [
          {
            cell_type: "markdown",
            metadata: {},
            source: ["# Hello"],
          },
        ],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      };

      const result = await commands.importFromIpynb(ipynbContent);

      expect(result).to.exist;
      expect(result.type).to.equal("doc");
      expect(result.content).to.be.an("array");
    });

    it("should handle empty ipynb files", async () => {
      const commands = new NotaCommands(notaConverter);
      const ipynbContent = {
        cells: [],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      };

      const result = await commands.importFromIpynb(ipynbContent);

      expect(result).to.exist;
      expect(result.content).to.be.an("array");
    });

    it("should preserve code cells in import", async () => {
      const commands = new NotaCommands(notaConverter);
      const ipynbContent = {
        cells: [
          {
            cell_type: "code",
            execution_count: null,
            metadata: {},
            source: ["x = 5"],
            outputs: [],
          },
        ],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      };

      const result = await commands.importFromIpynb(ipynbContent);

      expect(result.content.length).to.be.greaterThan(0);
      expect(result.content[0].type).to.equal("codeBlock");
    });
  });

  describe("getNotaFilePath", () => {
    it("should return current file path when available", () => {
      const commands = new NotaCommands(notaConverter);
      const mockUri = { fsPath: "/test/document.nota" };

      const result = commands.getNotaFilePath(mockUri);

      expect(result).to.equal("/test/document.nota");
    });

    it("should return null when no path available", () => {
      const commands = new NotaCommands(notaConverter);

      const result = commands.getNotaFilePath(null);

      expect(result).to.be.null;
    });
  });

  describe("generateIpynbFilename", () => {
    it("should generate ipynb filename from nota filename", () => {
      const commands = new NotaCommands(notaConverter);

      const result = commands.generateIpynbFilename("/path/to/document.nota");

      expect(result).to.include("document");
      expect(result).to.include(".ipynb");
    });

    it("should use default name when nota path is null", () => {
      const commands = new NotaCommands(notaConverter);

      const result = commands.generateIpynbFilename(null);

      expect(result).to.include(".ipynb");
      expect(result).to.not.include("null");
    });
  });
});
