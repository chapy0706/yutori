import type { AxisResult, TestAxis, TestCase } from "@yutori/contracts";

import type { InvocationTarget } from "../sandbox/invoke";
import type { SandboxRunner } from "../sandbox/runner";
import type { ContractDescriptor } from "../spec/contract-descriptor";

/** 各観点の判定に必要な文脈。grade.ts が一度だけ組み立てて全観点で使い回す。 */
export type AxisContext = {
  sandbox: SandboxRunner;
  taskId: string;
  timeBudgetMs: number;
  contract: ContractDescriptor;
  /** import 元ファイル (contract.file ?? targetFiles[0])。 */
  file: string;
  /** 退化差し替え後の実効コード。 */
  code: Record<string, string>;
  /** 課題の全テストケース。観点フィルタは各観点で行う。 */
  testCases: TestCase[];
};

/**
 * 各観点の判定結果。errored はタイムアウトや仕様記述子不正など、
 * ユーザーコードの誤りではない実行系の失敗を表す (verdict で "error" に落とす)。
 */
export type AxisOutcome = {
  axisResult: AxisResult;
  errored: boolean;
};

export function toTarget(context: AxisContext): InvocationTarget {
  return {
    sandbox: context.sandbox,
    taskId: context.taskId,
    timeBudgetMs: context.timeBudgetMs,
    code: context.code,
    file: context.file,
    exportName: context.contract.export,
  };
}

/** 指定観点のテストケースを orderIndex 昇順で取り出す。 */
export function casesFor(context: AxisContext, axis: TestAxis): TestCase[] {
  return context.testCases
    .filter((testCase) => testCase.axis === axis)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}
