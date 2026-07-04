import {
  type ExecutionRequest,
  type ExecutionResult,
  runInSandbox,
} from "@yutori/sandbox";

/**
 * grader が実行を委譲する sandbox の Port。
 *
 * grader は「判定」だけを担い、「実行」は sandbox に依頼する。この関数型を境界に
 * 置くことで、単体テストでは sandbox をモック化して grader の判定ロジックだけを
 * 軽量に検証できる (issue-07 の設計判断)。
 */
export type SandboxRunner = (
  request: ExecutionRequest,
  onStdout?: (line: string) => void,
) => Promise<ExecutionResult>;

/** 本番の sandbox 実装。QuickJS-WASM で実際にユーザーコードを走らせる。 */
export const defaultSandboxRunner: SandboxRunner = runInSandbox;

export type { ExecutionRequest, ExecutionResult };
