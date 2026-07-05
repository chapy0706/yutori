"use client";

import type { GradingOutput } from "@yutori/contracts";

import { AXIS_META } from "./axis-meta";

/**
 * リザルト表示 (design-spec 7.1)。
 *
 * まず「ここまでは合っている」を必ず示し、次に つまずいた観点のヒントを問いかけの
 * 形で渡す。称賛はせず、事実 (通過数・期待と実際) を落ち着いて並べる。
 */
export function ResultPanel({ output }: { output: GradingOutput }) {
  const passed = output.axisResults.filter((r) => r.passed);
  const failed = output.axisResults.find((r) => !r.passed) ?? null;
  const isCleared = output.result === "passed";

  return (
    <section aria-label="採点結果" className="space-y-4">
      <ResultBadge result={output.result} />

      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
        <p className="font-medium text-emerald-800 dark:text-emerald-200">
          ここまでは合っている
        </p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
          {passed.length > 0
            ? `${passed.map((r) => AXIS_META[r.axis].label).join("・")} が通過したよ（${passed.length}/5）。`
            : "まだ通過した観点はないけれど、ここから一つずつ確かめていこう。"}
        </p>
      </div>

      {failed !== null && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            もしかして…（{AXIS_META[failed.axis].label}）
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {failed.hint ?? "仕様ともう一度見比べてみよう。"}
          </p>
        </div>
      )}

      {output.degradedTasks !== null && output.degradedTasks.length > 0 && (
        <div className="rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="font-medium text-neutral-800 dark:text-neutral-200">
            過去の課題のコードが、いまの仕様に合わなくなっているみたい
          </p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            今回の採点は模範実装に差し替えて進めたよ。あとで戻って直すと、自分の作品として繋がるよ。
          </p>
        </div>
      )}

      {isCleared && (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          5つの観点すべてを通過したよ。次の課題へ進めるよ。
        </p>
      )}
    </section>
  );
}

const RESULT_TEXT: Record<GradingOutput["result"], string> = {
  passed: "すべて通過",
  partial: "途中まで通過",
  failed: "まだこれから",
  error: "採点できなかった",
};

function ResultBadge({ result }: { result: GradingOutput["result"] }) {
  const tone =
    result === "passed"
      ? "border-emerald-300 text-emerald-800 dark:text-emerald-200"
      : result === "partial"
        ? "border-sky-300 text-sky-800 dark:text-sky-200"
        : result === "error"
          ? "border-neutral-300 text-neutral-700 dark:text-neutral-300"
          : "border-amber-300 text-amber-800 dark:text-amber-200";
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${tone}`}
    >
      {RESULT_TEXT[result]}
    </span>
  );
}
