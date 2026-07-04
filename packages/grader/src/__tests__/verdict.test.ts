import type { AxisResult, Task } from "@yutori/contracts";
import { describe, expect, it } from "vitest";

import { checkDegradation } from "../verdict/degradation";
import { judgeResult } from "../verdict/judge";
import { makeSandbox } from "./helpers";

function axis(name: AxisResult["axis"], passed: boolean): AxisResult {
  return { axis: name, passed, failedTestIndex: null, hint: null };
}

describe("judgeResult", () => {
  it("5 観点すべて通過なら passed", () => {
    const results = [
      axis("structure", true),
      axis("contract", true),
      axis("basic", true),
      axis("spec", true),
      axis("robustness", true),
    ];
    expect(judgeResult(results, false)).toBe("passed");
  });

  it("一部通過して途中で失敗なら partial", () => {
    const results = [axis("structure", true), axis("contract", false)];
    expect(judgeResult(results, false)).toBe("partial");
  });

  it("最初の観点から失敗なら failed", () => {
    expect(judgeResult([axis("structure", false)], false)).toBe("failed");
  });

  it("errored なら error", () => {
    expect(judgeResult([axis("structure", true)], true)).toBe("error");
  });
});

function task(id: string, exportName: string, orderIndex: number): Task {
  return {
    id,
    courseId: "c1",
    orderIndex,
    title: id,
    description: "",
    targetFiles: [`${id}.js`],
    contractSchema: { export: exportName },
    timeBudgetMs: 1000,
    goalMediaPath: null,
    referenceImpl: { [`${id}.js`]: `export const ${exportName} = () => 1;` },
    createdAt: new Date(),
  };
}

describe("checkDegradation", () => {
  it("過去課題が無ければ提出コードをそのまま返す", async () => {
    const submittedCode = { "main.js": "export const x = 1;" };
    const result = await checkDegradation({
      sandbox: makeSandbox({}),
      submittedCode,
      previousTasks: [],
      previousReferenceImpls: {},
      timeBudgetMs: 1000,
    });
    expect(result.degradedTasks).toBeNull();
    expect(result.effectiveCode).toEqual(submittedCode);
  });

  it("整合性の取れた過去課題は差し替えない", async () => {
    const result = await checkDegradation({
      sandbox: makeSandbox({ helperA: () => 1 }),
      submittedCode: { "a.js": "export const helperA = () => 1;" },
      previousTasks: [task("a", "helperA", 1)],
      previousReferenceImpls: {},
      timeBudgetMs: 1000,
    });
    expect(result.degradedTasks).toBeNull();
  });

  it("壊れた過去課題を模範実装で差し替え、degradedTasks に記録する", async () => {
    const result = await checkDegradation({
      sandbox: makeSandbox({}), // helperA が存在しない = 退化
      submittedCode: { "a.js": "export const oops = 1;" },
      previousTasks: [task("a", "helperA", 1)],
      previousReferenceImpls: {
        a: { "a.js": "export const helperA = () => 1;" },
      },
      timeBudgetMs: 1000,
    });
    expect(result.degradedTasks).toEqual(["a"]);
    expect(result.effectiveCode["a.js"]).toContain("helperA");
  });
});
