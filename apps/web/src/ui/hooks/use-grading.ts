"use client";

import type {
  GradingInput,
  GradingOutput,
  Task,
  TestCase,
} from "@yutori/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { AXIS_ORDER } from "@/ui/components/grading/axis-meta";
import type { GradingEvent } from "@/ui/workers/grading-protocol";

export type AxisStatus = "pending" | "running" | "passed" | "failed";

export type AxisView = {
  axis: (typeof AXIS_ORDER)[number];
  status: AxisStatus;
  /** 失敗した観点のヒント。 */
  hint: string | null;
};

export type GradingPhase = "idle" | "grading" | "done" | "error";

export type GradingState = {
  phase: GradingPhase;
  axes: AxisView[];
  output: GradingOutput | null;
  errorMessage: string | null;
};

export type GradeRequest = {
  task: Task;
  testCases: TestCase[];
  input: GradingInput;
};

function initialAxes(): AxisView[] {
  return AXIS_ORDER.map((axis) => ({ axis, status: "pending", hint: null }));
}

const IDLE_STATE: GradingState = {
  phase: "idle",
  axes: initialAxes(),
  output: null,
  errorMessage: null,
};

/**
 * 採点 Worker と接続し、観点の通過状況をリアルタイムに購読するフック。
 * Worker のライフサイクル管理と、受信イベントから表示状態への変換を担う。
 */
export function useGrading() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<GradingState>(IDLE_STATE);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/grading.worker.ts", import.meta.url),
    );
    workerRef.current = worker;

    worker.onmessage = (message: MessageEvent<GradingEvent>) => {
      const event = message.data;
      setState((prev) => reduce(prev, event));
    };
    worker.onerror = () => {
      setState((prev) => ({
        ...prev,
        phase: "error",
        errorMessage:
          "採点の実行中に問題が起きたよ。少し待ってからもう一度試してみてね。",
      }));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = useCallback((request: GradeRequest) => {
    const worker = workerRef.current;
    if (worker === null) return;
    setState({
      phase: "grading",
      axes: initialAxes(),
      output: null,
      errorMessage: null,
    });
    worker.postMessage({ type: "grade", payload: request });
  }, []);

  const reset = useCallback(() => setState(IDLE_STATE), []);

  return { state, run, reset };
}

function reduce(prev: GradingState, event: GradingEvent): GradingState {
  switch (event.type) {
    case "axis-start":
      return {
        ...prev,
        axes: prev.axes.map((view, index) =>
          index === event.index ? { ...view, status: "running" } : view,
        ),
      };
    case "axis-complete":
      return {
        ...prev,
        axes: prev.axes.map((view, index) =>
          index === event.index
            ? {
                ...view,
                status: event.result.passed ? "passed" : "failed",
                hint: event.result.hint,
              }
            : view,
        ),
      };
    case "done":
      return { ...prev, phase: "done", output: event.output };
    case "failed":
      return { ...prev, phase: "error", errorMessage: event.message };
    default:
      return prev;
  }
}
