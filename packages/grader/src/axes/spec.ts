import type { AxisContext, AxisOutcome } from "./context";
import { runSchemaAxis } from "./schema-axis";

/**
 * 仕様観点: Zod スキーマ適合の判定。
 *
 * 各テストケースの expectedSchema に、戻り値の型・構造が適合するかを見る。
 * 値の厳密一致ではなく仕様への適合で採点する (ADR-0004)。
 */
export function specAxis(context: AxisContext): Promise<AxisOutcome> {
  return runSchemaAxis(context, "spec");
}
