import type {
  GradingInput,
  GradingOutput,
  Task,
  TestCase,
} from "@yutori/contracts";

import type { AxisContext } from "../axes/context";
import { resolveHint } from "../feedback/hint-resolver";
import { type SandboxRunner, defaultSandboxRunner } from "../sandbox/runner";
import { parseContract } from "../spec/contract-descriptor";
import { checkDegradation } from "../verdict/degradation";
import { judgeResult } from "../verdict/judge";
import { runCheckpoints } from "./checkpoint";
import { type Linter, noopLinter, runLintStage } from "./lint-stage";

/**
 * 採点パイプラインの入力。
 *
 * GradingInput (contracts) は submittedCode と退化チェック用の過去課題を持つが、
 * 現在課題の仕様 (contractSchema) とテストケースは持たない。grader は Next.js も
 * DB も知らない純粋な部品であるため、それらは呼び出し元 (API Route) が DB から
 * 取得し、task / testCases として明示的に渡す。sandbox / linter は差し替え可能で、
 * 単体テストでは軽量なモックを注入する。
 */
export type GradeParams = {
  task: Task;
  testCases: TestCase[];
  input: GradingInput;
  sandbox?: SandboxRunner;
  linter?: Linter;
};

function errorOutput(elapsedMs: number): GradingOutput {
  return {
    result: "error",
    axisResults: [],
    degradedTasks: null,
    elapsedMs,
  };
}

/**
 * 採点パイプラインの本体 (design-spec 5.3)。
 *
 *   提出 -> Biome 検査 -> 過去課題の整合性チェック -> 仮想 FS 構築(sandbox 委譲)
 *        -> 構造 -> 契約 -> 基本 -> 仕様 -> 頑健 -> 合否確定 + レポート
 */
export async function grade(params: GradeParams): Promise<GradingOutput> {
  const sandbox = params.sandbox ?? defaultSandboxRunner;
  const linter = params.linter ?? noopLinter;
  const start = Date.now();
  const elapsed = () => Date.now() - start;

  // 契約の解釈: 境界の unknown (Task.contractSchema) を検証する。
  let contract: ReturnType<typeof parseContract>;
  try {
    contract = parseContract(params.task.contractSchema);
  } catch {
    return errorOutput(elapsed());
  }

  const file = contract.file ?? params.task.targetFiles[0];
  if (file === undefined) return errorOutput(elapsed());

  // 1. 初期構文チェック段階。NG ならリンタ出力をヒントとして即座に返す。
  // 構文が通らない = 最初のチェックポイント (構造) にすら到達できないため、
  // 構造観点の失敗としてリンタ委譲ヒントを載せる。
  const lint = await runLintStage(params.input.submittedCode, linter);
  if (!lint.ok) {
    return {
      result: "failed",
      axisResults: [
        {
          axis: "structure",
          passed: false,
          failedTestIndex: null,
          hint: resolveHint({ lintDiagnostics: lint.diagnostics }),
        },
      ],
      degradedTasks: null,
      elapsedMs: elapsed(),
    };
  }

  // 2. 過去課題の整合性チェックと模範実装への差し替え。
  const degradation = await checkDegradation({
    sandbox,
    submittedCode: params.input.submittedCode,
    previousTasks: params.input.previousTasks,
    previousReferenceImpls: params.input.previousReferenceImpls,
    timeBudgetMs: params.task.timeBudgetMs,
  });

  // 3. チェックポイント方式で 5 観点を確認する。
  const context: AxisContext = {
    sandbox,
    taskId: params.task.id,
    timeBudgetMs: params.task.timeBudgetMs,
    contract,
    file,
    code: degradation.effectiveCode,
    testCases: params.testCases,
  };
  const { axisResults, errored } = await runCheckpoints(context);

  // 4. 合否確定 + レポート。
  return {
    result: judgeResult(axisResults, errored),
    axisResults,
    degradedTasks: degradation.degradedTasks,
    elapsedMs: elapsed(),
  };
}
