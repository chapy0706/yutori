import type { AxisResult } from "@yutori/contracts";

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

export type CheckpointOutcome = {
  axisResults: AxisResult[];
  errored: boolean;
};

export async function runCheckpoints(
  context: AxisContext,
): Promise<CheckpointOutcome> {
  const axisResults: AxisResult[] = [];

  for (const axis of AXES) {
    const outcome = await axis(context);
    axisResults.push(outcome.axisResult);
    if (!outcome.axisResult.passed) {
      return { axisResults, errored: outcome.errored };
    }
  }

  return { axisResults, errored: false };
}
