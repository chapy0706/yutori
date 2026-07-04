import type { GradingInput, Task, TestCase } from "@yutori/contracts";
import { describe, expect, it } from "vitest";

import { grade } from "../pipeline/grade";
import type { Linter } from "../pipeline/lint-stage";
import { makeSandbox } from "./helpers";

const addTask: Task = {
  id: "t1",
  courseId: "c1",
  orderIndex: 1,
  title: "add",
  description: "2 数の和を返す",
  targetFiles: ["add.js"],
  contractSchema: {
    export: "add",
    params: [{ type: "number" }, { type: "number" }],
    returns: { type: "number" },
  },
  timeBudgetMs: 1000,
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
    taskId: "t1",
    axis,
    orderIndex,
    payload: { input, expectedSchema, onFailHint: null },
  };
}

const addCases: TestCase[] = [
  tc("contract", 0, [1, 2], undefined),
  tc("basic", 0, [2, 3], { type: "number" }),
  tc("spec", 0, [10, 20], { type: "number" }),
  tc("robustness", 0, [0, 0], { type: "number" }),
];

function input(submittedCode: Record<string, string>): GradingInput {
  return {
    taskId: "t1",
    submittedCode,
    previousTasks: [],
    previousReferenceImpls: {},
  };
}

describe("grade (sandbox モック)", () => {
  it("5 観点すべて通過すれば passed", async () => {
    const output = await grade({
      task: addTask,
      testCases: addCases,
      input: input({ "add.js": "export const add = (a, b) => a + b;" }),
      sandbox: makeSandbox({ add: (a: number, b: number) => a + b }),
    });
    expect(output.result).toBe("passed");
    expect(output.axisResults).toHaveLength(5);
    expect(output.axisResults.every((r) => r.passed)).toBe(true);
    expect(output.degradedTasks).toBeNull();
  });

  it("途中の観点で失敗すれば partial (ここまでは通過)", async () => {
    const output = await grade({
      task: addTask,
      testCases: [
        tc("contract", 0, [1, 2], undefined),
        tc("basic", 0, [2, 3], { type: "number" }),
        tc("spec", 0, [10, 20], { type: "string" }),
      ],
      input: input({ "add.js": "export const add = (a, b) => a + b;" }),
      sandbox: makeSandbox({ add: (a: number, b: number) => a + b }),
    });
    expect(output.result).toBe("partial");
    const specResult = output.axisResults.find((r) => r.axis === "spec");
    expect(specResult?.passed).toBe(false);
    expect(
      output.axisResults.find((r) => r.axis === "robustness"),
    ).toBeUndefined();
  });

  it("構文チェック段階で失敗すればリンタ出力をヒントに failed", async () => {
    const failingLinter: Linter = () => ({
      ok: false,
      diagnostics: [{ message: "セミコロンが必要です", line: 1 }],
    });
    const output = await grade({
      task: addTask,
      testCases: addCases,
      input: input({ "add.js": "export const add = (a b) => a + b" }),
      sandbox: makeSandbox({ add: (a: number, b: number) => a + b }),
      linter: failingLinter,
    });
    expect(output.result).toBe("failed");
    expect(output.axisResults).toHaveLength(1);
    expect(output.axisResults[0]?.hint).toContain("セミコロン");
  });

  it("契約が解釈できなければ error", async () => {
    const output = await grade({
      task: { ...addTask, contractSchema: { nonsense: true } },
      testCases: addCases,
      input: input({ "add.js": "export const add = (a, b) => a + b;" }),
      sandbox: makeSandbox({ add: (a: number, b: number) => a + b }),
    });
    expect(output.result).toBe("error");
    expect(output.axisResults).toHaveLength(0);
  });

  it("壊れた過去課題を検出し degradedTasks に記録する", async () => {
    const output = await grade({
      task: addTask,
      testCases: addCases,
      input: {
        taskId: "t1",
        submittedCode: { "add.js": "export const add = (a, b) => a + b;" },
        previousTasks: [
          {
            id: "t0",
            courseId: "c1",
            orderIndex: 1,
            title: "helper",
            description: "",
            targetFiles: ["helper.js"],
            contractSchema: { export: "helper" },
            timeBudgetMs: 1000,
            goalMediaPath: null,
            referenceImpl: { "helper.js": "export const helper = () => 1;" },
            createdAt: new Date(),
          },
        ],
        previousReferenceImpls: {
          t0: { "helper.js": "export const helper = () => 1;" },
        },
      },
      // helper が存在しない = 退化。add は健在。
      sandbox: makeSandbox({ add: (a: number, b: number) => a + b }),
    });
    expect(output.result).toBe("passed");
    expect(output.degradedTasks).toEqual(["t0"]);
  });
});
