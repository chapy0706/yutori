"use client";

import type { AxisView } from "@/ui/hooks/use-grading";
import { AXIS_META } from "./axis-meta";

/**
 * 観点の通過状況をリアルタイムに表示する。
 *
 * 進捗は「2/5 失敗」ではなく「N/5 通過、次は…」と前向きにフレーミングする
 * (design-spec 7.1)。各観点は 保留 / 実行中 / 通過 / 失敗 の 4 状態で示す。
 */
export function AxisProgress({
  axes,
  phase,
}: {
  axes: AxisView[];
  phase: "idle" | "grading" | "done" | "error";
}) {
  const passedCount = axes.filter((a) => a.status === "passed").length;
  const running = axes.find((a) => a.status === "running") ?? null;
  const runningNote =
    running !== null
      ? `、いま「${AXIS_META[running.axis].label}」を確認中`
      : "";

  return (
    <section aria-label="採点の進捗" className="space-y-3">
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        {phase === "idle"
          ? "提出すると、5つの観点を上から順に確認するよ。"
          : `${passedCount}/5 通過${runningNote}`}
      </p>
      <ul className="space-y-2">
        {axes.map((view) => {
          const meta = AXIS_META[view.axis];
          return (
            <li
              key={view.axis}
              className="flex items-center gap-3 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-800"
            >
              <StatusDot status={view.status} />
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {meta.label}
                </p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {meta.summary}
                </p>
              </div>
              <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
                {STATUS_LABEL[view.status]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const STATUS_LABEL: Record<AxisView["status"], string> = {
  pending: "これから",
  running: "確認中",
  passed: "通過",
  failed: "つまずき",
};

function StatusDot({ status }: { status: AxisView["status"] }) {
  const color =
    status === "passed"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-amber-500"
        : status === "running"
          ? "bg-sky-500 animate-pulse"
          : "bg-neutral-300 dark:bg-neutral-700";
  return (
    <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
  );
}
