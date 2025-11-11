/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { expect } from "chai";
import * as sinon from "sinon";
import { ColabClient } from "../colab/client";

describe("CodeExecutor", () => {
  let colabClientStub: sinon.SinonStubbedInstance<ColabClient>;
  let CodeExecutor: any;

  beforeEach(async () => {
    colabClientStub = sinon.createStubInstance(ColabClient);
    // Import the module
    const module = await import("./CodeExecutor.js");
    CodeExecutor = module.CodeExecutor;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("constructor", () => {
    it("should create a CodeExecutor instance", () => {
      const executor = new CodeExecutor(colabClientStub);
      expect(executor).to.exist;
    });
  });

  describe("execute", () => {
    it("should return a placeholder message when Colab client is not connected", async () => {
      const executor = new CodeExecutor(colabClientStub);
      
      const result = await executor.execute("print('hello')", "python");
      
      expect(result).to.exist;
      expect(result.output).to.include("Code execution");
      expect(result.success).to.be.false;
    });

    it("should handle empty code", async () => {
      const executor = new CodeExecutor(colabClientStub);
      
      const result = await executor.execute("", "python");
      
      expect(result).to.exist;
      expect(result.output).to.exist;
      expect(result.success).to.be.false;
    });

    it("should return code in the output for now", async () => {
      const executor = new CodeExecutor(colabClientStub);
      const code = "x = 5\nprint(x * 2)";
      
      const result = await executor.execute(code, "python");
      
      expect(result).to.exist;
      expect(result.output).to.include(code);
    });

    it("should support different languages", async () => {
      const executor = new CodeExecutor(colabClientStub);
      
      const pythonResult = await executor.execute("print('hello')", "python");
      const jsResult = await executor.execute("console.log('hello')", "javascript");
      
      expect(pythonResult).to.exist;
      expect(jsResult).to.exist;
    });
  });

  describe("getStatus", () => {
    it("should return not connected status initially", () => {
      const executor = new CodeExecutor(colabClientStub);
      
      const status = executor.getStatus();
      
      expect(status).to.equal("disconnected");
    });
  });
});
