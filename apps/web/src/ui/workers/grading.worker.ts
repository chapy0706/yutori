/// <reference lib="webworker" />
import { grade } from "@yutori/grader";

import type { GradingEvent, GradingRequest } from "./grading-protocol";

/**
 * 採点 Worker。QuickJS-WASM (sandbox) を内側で走らせ、grader.grade() を実行する。
 * grade() の reporter を通じて各観点の開始・完了をメインスレッドへ逐次通知し、
 * 最後に最終結果を送る。判定ロジックは grader が持ち、Worker は配線に徹する。
 */
const ctx = self as unknown as DedicatedWorkerGlobalScope;

function emit(event: GradingEvent): void {
  ctx.postMessage(event);
}

ctx.onmessage = async (message: MessageEvent<GradingRequest>) => {
  const request = message.data;
  if (request.type !== "grade") return;

  try {
    const output = await grade({
      task: request.payload.task,
      testCases: request.payload.testCases,
      input: request.payload.input,
      reporter: {
        onAxisStart: (axis, index) => emit({ type: "axis-start", axis, index }),
        onAxisComplete: (result, index) =>
          emit({ type: "axis-complete", result, index }),
      },
    });
    emit({ type: "done", output });
  } catch (error) {
    emit({
      type: "failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
