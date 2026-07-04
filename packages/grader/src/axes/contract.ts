import type { AxisResult } from "@yutori/contracts";

import { resolveHint } from "../feedback/hint-resolver";
import { reflectExport } from "../sandbox/invoke";
import {
  type AxisContext,
  type AxisOutcome,
  casesFor,
  toTarget,
} from "./context";
import { evaluateCall } from "./evaluate";

function fail(hint: string, failedTestIndex: number | null): AxisResult {
  return { axis: "contract", passed: false, failedTestIndex, hint };
}

/**
 * 契約観点: Zod スキーマによる引数・戻り値の型判定。
 *
 * エクスポートが関数であること、引数個数が契約と一致すること、そして契約観点の
 * テストケースについて戻り値が contract.returns の型に適合することを見る。
 * (個々の課題固有の仕様は仕様観点、単純入力での動作は基本観点が担う。)
 */
export async function contractAxis(context: AxisContext): Promise<AxisOutcome> {
  const target = toTarget(context);
  const reflect = await reflectExport(target);

  if (reflect.timedOut) {
    return {
      errored: true,
      axisResult: fail("コードの読み込みが時間内に終わらなかったよ。", null),
    };
  }
  if (reflect.error !== null) {
    return {
      errored: false,
      axisResult: fail(resolveHint({ execError: reflect.error }), null),
    };
  }
  if (!reflect.isFunction) {
    return {
      errored: false,
      axisResult: fail(
        `${context.contract.export} は関数としてエクスポートされているかな。`,
        null,
      ),
    };
  }

  const params = context.contract.params;
  if (params !== undefined && reflect.length !== params.length) {
    return {
      errored: false,
      axisResult: fail(
        `引数の数が仕様と違うみたい。期待は ${params.length} 個、いまは ${reflect.length ?? 0} 個だよ。`,
        null,
      ),
    };
  }

  // 契約観点のテストケースで戻り値の型を確認する。
  for (const testCase of casesFor(context, "contract")) {
    const evaluation = await evaluateCall(
      target,
      testCase.payload.input,
      context.contract.returns,
    );
    switch (evaluation.kind) {
      case "ok":
        break;
      case "errored":
        return {
          errored: true,
          axisResult: fail(evaluation.hint, testCase.orderIndex),
        };
      case "threw":
        return {
          errored: false,
          axisResult: fail(
            resolveHint({
              onFailHint: testCase.payload.onFailHint,
              thrown: evaluation.thrown,
            }),
            testCase.orderIndex,
          ),
        };
      case "missing":
        return {
          errored: false,
          axisResult: fail(
            resolveHint({
              onFailHint: testCase.payload.onFailHint,
              missingReturn: true,
            }),
            testCase.orderIndex,
          ),
        };
      case "mismatch":
        return {
          errored: false,
          axisResult: fail(
            resolveHint({
              onFailHint: testCase.payload.onFailHint,
              schemaError: evaluation.error,
              actual: evaluation.actual,
            }),
            testCase.orderIndex,
          ),
        };
    }
  }

  return {
    errored: false,
    axisResult: {
      axis: "contract",
      passed: true,
      failedTestIndex: null,
      hint: null,
    },
  };
}
