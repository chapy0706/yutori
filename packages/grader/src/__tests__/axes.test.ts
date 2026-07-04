import type { TestAxis, TestCase } from "@yutori/contracts";
import { describe, expect, it } from "vitest";

import { basicAxis } from "../axes/basic";
import type { AxisContext } from "../axes/context";
import { contractAxis } from "../axes/contract";
import { robustnessAxis } from "../axes/robustness";
import { specAxis } from "../axes/spec";
import { structureAxis } from "../axes/structure";
import type { ContractDescriptor } from "../spec/contract-descriptor";
import { erroringSandbox, makeSandbox, timingOutSandbox } from "./helpers";

const addContract: ContractDescriptor = {
  export: "add",
  params: [{ type: "number" }, { type: "number" }],
  returns: { type: "number" },
};

function ctx(overrides: Partial<AxisContext> = {}): AxisContext {
  return {
    sandbox: makeSandbox({ add: (a: number, b: number) => a + b }),
    taskId: "t1",
    timeBudgetMs: 1000,
    contract: addContract,
    file: "add.js",
    code: { "add.js": "export const add = (a, b) => a + b;" },
    testCases: [],
    ...overrides,
  };
}

function tc(
  axis: TestAxis,
  orderIndex: number,
  input: unknown,
  expectedSchema: unknown,
  onFailHint: string | null = null,
): TestCase {
  return {
    id: `${axis}-${orderIndex}`,
    taskId: "t1",
    axis,
    orderIndex,
    payload: { input, expectedSchema, onFailHint },
  };
}

describe("structureAxis", () => {
  it("エクスポートがあれば通過する", async () => {
    const outcome = await structureAxis(ctx());
    expect(outcome.axisResult.passed).toBe(true);
    expect(outcome.errored).toBe(false);
  });

  it("エクスポートが無ければ失敗しヒントを返す", async () => {
    const outcome = await structureAxis(ctx({ sandbox: makeSandbox({}) }));
    expect(outcome.axisResult.passed).toBe(false);
    expect(outcome.axisResult.hint).toContain("add");
  });

  it("import / 構文エラーは失敗し、パターンヒントを返す", async () => {
    const outcome = await structureAxis(
      ctx({
        sandbox: erroringSandbox({
          name: "SyntaxError",
          message: "unexpected token",
          stack: null,
        }),
      }),
    );
    expect(outcome.axisResult.passed).toBe(false);
    expect(outcome.axisResult.hint).toContain("文法");
  });

  it("タイムアウトは errored として失敗する", async () => {
    const outcome = await structureAxis(ctx({ sandbox: timingOutSandbox() }));
    expect(outcome.axisResult.passed).toBe(false);
    expect(outcome.errored).toBe(true);
  });
});

describe("contractAxis", () => {
  it("関数・引数個数・戻り値型が合えば通過する", async () => {
    const outcome = await contractAxis(
      ctx({ testCases: [tc("contract", 0, [1, 2], undefined)] }),
    );
    expect(outcome.axisResult.passed).toBe(true);
  });

  it("引数個数が契約と違えば失敗する", async () => {
    const outcome = await contractAxis(
      ctx({
        sandbox: makeSandbox({ add: (a: number) => a }),
      }),
    );
    expect(outcome.axisResult.passed).toBe(false);
    expect(outcome.axisResult.hint).toContain("引数の数");
  });

  it("関数でなければ失敗する", async () => {
    const outcome = await contractAxis(
      ctx({ sandbox: makeSandbox({ add: 42 }) }),
    );
    expect(outcome.axisResult.passed).toBe(false);
    expect(outcome.axisResult.hint).toContain("関数");
  });

  it("戻り値の型が契約に合わなければ失敗する", async () => {
    const outcome = await contractAxis(
      ctx({
        sandbox: makeSandbox({ add: () => "not a number" }),
        contract: { ...addContract, params: undefined },
        testCases: [tc("contract", 0, [1, 2], undefined)],
      }),
    );
    expect(outcome.axisResult.passed).toBe(false);
    expect(outcome.axisResult.failedTestIndex).toBe(0);
  });
});

describe("basicAxis", () => {
  it("単純入力で正しく動けば通過する", async () => {
    const outcome = await basicAxis(
      ctx({ testCases: [tc("basic", 0, [2, 3], { type: "number" })] }),
    );
    expect(outcome.axisResult.passed).toBe(true);
  });

  it("例外を投げれば失敗する", async () => {
    const outcome = await basicAxis(
      ctx({
        sandbox: makeSandbox({
          add: () => {
            throw new Error("boom");
          },
        }),
        testCases: [tc("basic", 0, [2, 3], { type: "number" })],
      }),
    );
    expect(outcome.axisResult.passed).toBe(false);
    expect(outcome.axisResult.failedTestIndex).toBe(0);
  });

  it("何も返さなければ失敗する", async () => {
    const outcome = await basicAxis(
      ctx({
        sandbox: makeSandbox({ add: () => undefined }),
        testCases: [tc("basic", 0, [2, 3], { type: "number" })],
      }),
    );
    expect(outcome.axisResult.passed).toBe(false);
    expect(outcome.axisResult.hint).toContain("return");
  });
});

describe("specAxis", () => {
  it("仕様スキーマに適合すれば通過する", async () => {
    const outcome = await specAxis(
      ctx({
        sandbox: makeSandbox({ add: (a: number, b: number) => a + b }),
        testCases: [tc("spec", 0, [2, 3], { type: "number", int: true })],
      }),
    );
    expect(outcome.axisResult.passed).toBe(true);
  });

  it("仕様に合わなければ失敗し、固有ヒントを優先する", async () => {
    const outcome = await specAxis(
      ctx({
        sandbox: makeSandbox({ add: () => 3.5 }),
        testCases: [
          tc(
            "spec",
            0,
            [2, 3],
            { type: "number", int: true },
            "整数を返せているかな",
          ),
        ],
      }),
    );
    expect(outcome.axisResult.passed).toBe(false);
    expect(outcome.axisResult.hint).toBe("整数を返せているかな");
  });

  it("複数ケースは orderIndex 順に確認し、最初の失敗で打ち切る", async () => {
    const outcome = await specAxis(
      ctx({
        sandbox: makeSandbox({ add: (a: number, b: number) => a + b }),
        testCases: [
          tc("spec", 1, [2, 3], { type: "string" }),
          tc("spec", 0, [2, 3], { type: "number" }),
        ],
      }),
    );
    expect(outcome.axisResult.passed).toBe(false);
    expect(outcome.axisResult.failedTestIndex).toBe(1);
  });
});

describe("robustnessAxis", () => {
  it("空・不正入力を仕様内で扱えれば通過する", async () => {
    const outcome = await robustnessAxis(
      ctx({
        sandbox: makeSandbox({
          add: (a: number, b: number) => (a ?? 0) + (b ?? 0),
        }),
        testCases: [tc("robustness", 0, [null, null], { type: "number" })],
      }),
    );
    expect(outcome.axisResult.passed).toBe(true);
  });

  it("不正入力で落ちれば失敗する", async () => {
    const outcome = await robustnessAxis(
      ctx({
        sandbox: makeSandbox({
          add: (a: { x: number }) => a.x,
        }),
        testCases: [tc("robustness", 0, [null], { type: "number" })],
      }),
    );
    expect(outcome.axisResult.passed).toBe(false);
  });
});
