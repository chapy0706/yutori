import { resolveHint } from "../feedback/hint-resolver";
import { reflectExport } from "../sandbox/invoke";
import { type AxisContext, type AxisOutcome, toTarget } from "./context";

/**
 * 構造観点: エクスポートの有無。
 *
 * 契約が指すファイルに、契約が指す名前のエクスポートが存在するかだけを見る
 * (関数か・型が正しいかは契約観点の担当)。import / 構文エラーもここで最初に露見する。
 */
export async function structureAxis(
  context: AxisContext,
): Promise<AxisOutcome> {
  const reflect = await reflectExport(toTarget(context));

  if (reflect.timedOut) {
    return {
      errored: true,
      axisResult: {
        axis: "structure",
        passed: false,
        failedTestIndex: null,
        hint: "コードの読み込みが時間内に終わらなかったよ。重い処理が先頭にないか見てみよう。",
      },
    };
  }

  if (reflect.error !== null) {
    return {
      errored: false,
      axisResult: {
        axis: "structure",
        passed: false,
        failedTestIndex: null,
        hint: resolveHint({ execError: reflect.error }),
      },
    };
  }

  if (!reflect.present) {
    return {
      errored: false,
      axisResult: {
        axis: "structure",
        passed: false,
        failedTestIndex: null,
        hint: `${context.contract.export} という名前でエクスポートできているかな。export を確かめてみよう。`,
      },
    };
  }

  return {
    errored: false,
    axisResult: {
      axis: "structure",
      passed: true,
      failedTestIndex: null,
      hint: null,
    },
  };
}
