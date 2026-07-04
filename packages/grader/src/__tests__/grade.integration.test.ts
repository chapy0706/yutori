import type { GradingInput, Task, TestCase } from "@yutori/contracts";
import { describe, expect, it } from "vitest";

import { grade } from "../pipeline/grade";

/**
 * 結合テスト: 実際の QuickJS-WASM sandbox (defaultSandboxRunner) を用いて、
 * おもちゃ課題 (add 関数) の採点が端から端まで通ることを確認する。
 * sandbox をモックせず、grader と sandbox の結合を検証する。
 */
const addTask: Task = {
  id: "toy-add",
  courseId: "toy",
  orderIndex: 1,
  title: "add",
  description: "2 数の和を返す",
  targetFiles: ["add.js"],
  contractSchema: {
    export: "add",
    params: [{ type: "number" }, { type: "number" }],
    returns: { type: "number" },
  },
  timeBudgetMs: 2000,
  goalMediaPath: null,
  referenceImpl: {},
  createdAt: new Date(),
};

function tc(
  axis: TestCase["axis"],
  orderIndex: number,
  input: unknown,
  expectedSchema: unknown,
): TestCase {
  return {
    id: `${axis}-${orderIndex}`,
    taskId: "toy-add",
    axis,
    orderIndex,
    payload: { input, expectedSchema, onFailHint: null },
  };
}

const cases: TestCase[] = [
  tc("contract", 0, [1, 2], undefined),
  tc("basic", 0, [2, 3], { type: "number" }),
  tc("spec", 0, [10, 20], { type: "number" }),
  tc("spec", 1, [-5, 5], { type: "number" }),
  tc("robustness", 0, [0, 0], { type: "number" }),
];

function input(code: string): GradingInput {
  return {
    taskId: "toy-add",
    submittedCode: { "add.js": code },
    previousTasks: [],
    previousReferenceImpls: {},
  };
}

describe("grade + 実 sandbox (結合)", () => {
  it("正しい add 実装は passed になる", async () => {
    const output = await grade({
      task: addTask,
      testCases: cases,
      input: input("export const add = (a, b) => a + b;"),
    });
    expect(output.result).toBe("passed");
    expect(output.axisResults).toHaveLength(5);
    expect(output.elapsedMs).toBeGreaterThanOrEqual(0);
  }, 15000);

  it("エクスポート名が違うと structure から失敗する", async () => {
    const output = await grade({
      task: addTask,
      testCases: cases,
      input: input("export const sum = (a, b) => a + b;"),
    });
    expect(output.result).toBe("failed");
    expect(output.axisResults[0]?.axis).toBe("structure");
    expect(output.axisResults[0]?.passed).toBe(false);
  }, 15000);

  it("戻り値の型が契約に合わないと契約観点で失敗し partial になる", async () => {
    const output = await grade({
      task: addTask,
      testCases: cases,
      input: input("export const add = (a, b) => `${a}${b}`;"),
    });
    expect(output.result).toBe("partial");
    const contract = output.axisResults.find((r) => r.axis === "contract");
    expect(contract?.passed).toBe(false);
  }, 15000);

  it("実行時に例外を投げると最初の呼び出し観点 (契約) で失敗する", async () => {
    const output = await grade({
      task: addTask,
      testCases: cases,
      input: input(
        "export const add = (a, b) => { throw new Error('boom'); };",
      ),
    });
    expect(output.result).toBe("partial");
    const contract = output.axisResults.find((r) => r.axis === "contract");
    expect(contract?.passed).toBe(false);
    expect(output.axisResults.find((r) => r.axis === "basic")).toBeUndefined();
  }, 15000);
});
