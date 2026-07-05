import type { AxisResult, TestAxis } from "@yutori/contracts";

import { basicAxis } from "../axes/basic";
import type { AxisContext } from "../axes/context";
import { contractAxis } from "../axes/contract";
import { robustnessAxis } from "../axes/robustness";
import { specAxis } from "../axes/spec";
import { structureAxis } from "../axes/structure";

/**
 * チェックポイント方式の観点確認 (design-spec 5.3 / README)。
 *
 * 5 観点を構造 → 契約 → 基本 → 仕様 → 頑健の順で上から確認し、失敗した時点で
 * 以降を打ち切る。返す axisResults には到達した観点だけが順に入る。
 */
const AXES = [
  structureAxis,
  contractAxis,
  basicAxis,
  specAxis,
  robustnessAxis,
] as const;

/** AXES と同じ並びの観点名。onAxisStart で実行前に観点名を渡すために使う。 */
export const AXIS_ORDER: readonly TestAxis[] = [
  "structure",
  "contract",
  "basic",
  "spec",
  "robustness",
];

export type CheckpointOutcome = {
  axisResults: AxisResult[];
  errored: boolean;
};

/**
 * 観点の進捗レポータ。UI (Worker 経由) が通過状況をリアルタイムに表示するための
 * フック。判定ロジックには影響せず、観測のみを行う。
 */
export type AxisProgressReporter = {
  /** その観点の判定を開始した (実行中表示用)。 */
  onAxisStart?: (axis: TestAxis, index: number) => void;
  /** その観点の判定が終わった (通過・失敗の確定)。 */
  onAxisComplete?: (result: AxisResult, index: number) => void;
};

export async function runCheckpoints(
  context: AxisContext,
  reporter?: AxisProgressReporter,
): Promise<CheckpointOutcome> {
  const axisResults: AxisResult[] = [];

  for (let index = 0; index < AXES.length; index++) {
    const axis = AXES[index];
    if (axis === undefined) continue;
    reporter?.onAxisStart?.(AXIS_ORDER[index] as TestAxis, index);
    const outcome = await axis(context);
    axisResults.push(outcome.axisResult);
    reporter?.onAxisComplete?.(outcome.axisResult, index);
    if (!outcome.axisResult.passed) {
      return { axisResults, errored: outcome.errored };
    }
  }

  return { axisResults, errored: false };
}
