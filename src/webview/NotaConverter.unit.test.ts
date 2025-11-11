/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { expect } from "chai";

describe("NotaConverter", () => {
  let NotaConverter: any;

  beforeEach(async () => {
    const module = await import("./NotaConverter.js");
    NotaConverter = module.NotaConverter;
  });

  describe("ipynbToNota", () => {
    it("should convert empty Jupyter notebook to Nota format", () => {
      const converter = new NotaConverter();
      const ipynb = {
        cells: [],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      };

      const nota = converter.ipynbToNota(ipynb);

      expect(nota).to.exist;
      expect(nota.type).to.equal("doc");
      expect(nota.content).to.be.an("array");
    });

    it("should convert Jupyter markdown cell to Nota paragraph", () => {
      const converter = new NotaConverter();
      const ipynb = {
        cells: [
          {
            cell_type: "markdown",
            metadata: {},
            source: ["# Hello World\n", "This is a test"],
          },
        ],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      };

      const nota = converter.ipynbToNota(ipynb);

      expect(nota.content).to.have.lengthOf.at.least(1);
      expect(nota.content[0].type).to.equal("heading");
    });

    it("should convert Jupyter code cell to Nota code block", () => {
      const converter = new NotaConverter();
      const ipynb = {
        cells: [
          {
            cell_type: "code",
            execution_count: 1,
            metadata: {},
            source: ["print('hello')"],
            outputs: [],
          },
        ],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      };

      const nota = converter.ipynbToNota(ipynb);

      expect(nota.content).to.have.lengthOf.at.least(1);
      expect(nota.content[0].type).to.equal("codeBlock");
      expect(nota.content[0].attrs.language).to.equal("python");
    });

    it("should handle multiple cells", () => {
      const converter = new NotaConverter();
      const ipynb = {
        cells: [
          {
            cell_type: "markdown",
            metadata: {},
            source: ["# Title"],
          },
          {
            cell_type: "code",
            execution_count: 1,
            metadata: {},
            source: ["x = 5"],
            outputs: [],
          },
        ],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      };

      const nota = converter.ipynbToNota(ipynb);

      expect(nota.content.length).to.be.at.least(2);
    });
  });

  describe("notaToIpynb", () => {
    it("should convert empty Nota to Jupyter notebook", () => {
      const converter = new NotaConverter();
      const nota = {
        type: "doc",
        content: [],
      };

      const ipynb = converter.notaToIpynb(nota);

      expect(ipynb).to.exist;
      expect(ipynb.cells).to.be.an("array");
      expect(ipynb.nbformat).to.equal(4);
      expect(ipynb.nbformat_minor).to.equal(5);
    });

    it("should convert Nota heading to Jupyter markdown cell", () => {
      const converter = new NotaConverter();
      const nota = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Hello World" }],
          },
        ],
      };

      const ipynb = converter.notaToIpynb(nota);

      expect(ipynb.cells).to.have.lengthOf.at.least(1);
      expect(ipynb.cells[0].cell_type).to.equal("markdown");
      expect(ipynb.cells[0].source).to.include("# Hello World");
    });

    it("should convert Nota code block to Jupyter code cell", () => {
      const converter = new NotaConverter();
      const nota = {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: { language: "python" },
            content: [{ type: "text", text: "print('hello')" }],
          },
        ],
      };

      const ipynb = converter.notaToIpynb(nota);

      expect(ipynb.cells).to.have.lengthOf(1);
      expect(ipynb.cells[0].cell_type).to.equal("code");
      expect(ipynb.cells[0].source).to.deep.equal(["print('hello')"]);
    });

    it("should convert Nota paragraph to Jupyter markdown", () => {
      const converter = new NotaConverter();
      const nota = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Regular text" }],
          },
        ],
      };

      const ipynb = converter.notaToIpynb(nota);

      expect(ipynb.cells).to.have.lengthOf(1);
      expect(ipynb.cells[0].cell_type).to.equal("markdown");
    });
  });

  describe("roundtrip conversion", () => {
    it("should maintain structure after ipynb -> nota -> ipynb", () => {
      const converter = new NotaConverter();
      const originalIpynb = {
        cells: [
          {
            cell_type: "code",
            execution_count: null,
            metadata: {},
            source: ["print('test')"],
            outputs: [],
          },
        ],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      };

      const nota = converter.ipynbToNota(originalIpynb);
      const convertedIpynb = converter.notaToIpynb(nota);

      expect(convertedIpynb.cells).to.have.lengthOf(1);
      expect(convertedIpynb.cells[0].cell_type).to.equal("code");
    });
  });
});
