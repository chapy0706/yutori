import type {
  AxisResult,
  GradingInput,
  GradingOutput,
  Task,
  TestAxis,
  TestCase,
} from "@yutori/contracts";

/**
 * 課題ページのメインスレッドと採点 Worker の間のメッセージ契約。
 *
 * 採点は QuickJS-WASM を使うため Worker 内で実行し (ADR-0002)、観点の通過状況を
 * postMessage で逐次流す。Worker は「何が起きたか」を構造化して流すだけとし、
 * 表示判断はメインスレッド側 (hook / component) に委ねる。
 */

/** メイン -> Worker: 採点開始の依頼。 */
export type GradingRequest = {
  type: "grade";
  payload: {
    task: Task;
    testCases: TestCase[];
    input: GradingInput;
  };
};

/** Worker -> メイン: 進捗と結果。 */
export type GradingEvent =
  | { type: "axis-start"; axis: TestAxis; index: number }
  | { type: "axis-complete"; result: AxisResult; index: number }
  | { type: "done"; output: GradingOutput }
  | { type: "failed"; message: string };
