import type { AxisContext, AxisOutcome } from "./context";
import { runSchemaAxis } from "./schema-axis";

/**
 * 頑健観点: 不正・空入力。
 *
 * 空や不正な入力を与えても仕様の範囲で振る舞えるかを見る。想定外の入力で
 * 例外を投げて落ちることを失敗とみなす (仕様が例外を許容する場合は expectedSchema
 * とヒント設計でその意図を表す)。
 */
export function robustnessAxis(context: AxisContext): Promise<AxisOutcome> {
  return runSchemaAxis(context, "robustness", {
    threwHint:
      "空や不正な入力で落ちてしまったみたい。そうした入力も起きうると考えて備えられているかな。",
  });
}
