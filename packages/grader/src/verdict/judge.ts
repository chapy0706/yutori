import type { AxisResult, SubmissionResult } from "@yutori/contracts";

/**
 * 観点結果を集約して合否を確定する。
 *
 * axisResults はチェックポイント方式で「到達した観点」だけが入る (最初の失敗で
 * 打ち切るため、失敗観点が末尾)。design-spec 7.1 の「ここまでは合っている」を
 * partial として表現する。
 *
 *   - error  : タイムアウト等の実行系エラーで採点が成立しなかった
 *   - passed : 5 観点すべて通過
 *   - partial: 一部の観点は通ったが、途中で失敗した
 *   - failed : 最初の観点から通らなかった
 */
export function judgeResult(
  axisResults: AxisResult[],
  errored: boolean,
): SubmissionResult {
  if (errored) return "error";

  const passedCount = axisResults.filter((r) => r.passed).length;
  if (passedCount === 5) return "passed";
  if (passedCount >= 1) return "partial";
  return "failed";
}
