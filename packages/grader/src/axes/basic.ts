import type { AxisContext, AxisOutcome } from "./context";
import { runSchemaAxis } from "./schema-axis";

/**
 * 基本観点: 単純入力のスモークテスト。
 *
 * 代表的な単純入力で関数が落ちずに動き、戻り値が各ケースの仕様に収まるかを見る。
 */
export function basicAxis(context: AxisContext): Promise<AxisOutcome> {
  return runSchemaAxis(context, "basic");
}
