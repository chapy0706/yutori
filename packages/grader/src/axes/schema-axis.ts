import type { AxisResult, TestAxis } from "@yutori/contracts";

import { resolveHint } from "../feedback/hint-resolver";
import {
  type AxisContext,
  type AxisOutcome,
  casesFor,
  toTarget,
} from "./context";
import { evaluateCall } from "./evaluate";

/**
 * テストケースごとに呼び出し、戻り値を各ケースの expectedSchema へ適合判定する
 * 共通ロジック。基本・仕様・頑健観点はこの枠組みを共有し、意味づけ (どの観点の
 * ケースを見るか) だけが異なる。判定はチェックポイント方式で、最初の失敗で打ち切る。
 */
export async function runSchemaAxis(
  context: AxisContext,
  axis: TestAxis,
  options: { threwHint?: string } = {},
): Promise<AxisOutcome> {
  const target = toTarget(context);

  for (const testCase of casesFor(context, axis)) {
    const evaluation = await evaluateCall(
      target,
      testCase.payload.input,
      testCase.payload.expectedSchema,
    );

    const fail = (hint: string): AxisOutcome => ({
      errored: false,
      axisResult: {
        axis,
        passed: false,
        failedTestIndex: testCase.orderIndex,
        hint,
      },
    });

    switch (evaluation.kind) {
      case "ok":
        break;
      case "errored":
        return {
          errored: true,
          axisResult: {
            axis,
            passed: false,
            failedTestIndex: testCase.orderIndex,
            hint: evaluation.hint,
          },
        };
      case "threw":
        return fail(
          resolveHint({
            onFailHint: testCase.payload.onFailHint,
            thrown: evaluation.thrown,
            fallbackHint: options.threwHint ?? null,
          }),
        );
      case "missing":
        return fail(
          resolveHint({
            onFailHint: testCase.payload.onFailHint,
            missingReturn: true,
          }),
        );
      case "mismatch":
        return fail(
          resolveHint({
            onFailHint: testCase.payload.onFailHint,
            schemaError: evaluation.error,
            actual: evaluation.actual,
          }),
        );
    }
  }

  const passed: AxisResult = {
    axis,
    passed: true,
    failedTestIndex: null,
    hint: null,
  };
  return { errored: false, axisResult: passed };
}
