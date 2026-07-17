import type { WeeklyProgress } from "@/core/learning/progress-service";

/**
 * 今週の進捗サマリ (学習日数・クリア課題数と、先週との比較)。
 *
 * 比較はあくまで「増えた分の喜び」を伝える情報であって、減った週を責めない
 * (ADR-0006 の獲得志向)。前週と同じ・減った場合はそっと控えめに示す。
 */

/** 先週差を、増加時だけ前向きに、それ以外は静かに表す。 */
function deltaText(current: number, previous: number, unit: string): string {
  const diff = current - previous;
  if (diff > 0) return `先週より +${diff}${unit}`;
  if (diff === 0) return "先週と同じペース";
  return `先週 ${previous}${unit}`;
}

function SummaryCard({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: number;
  unit: string;
  delta: string;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <span className="text-sm text-neutral-600 dark:text-neutral-300">
        {label}
      </span>
      <span className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">
        {value}
        <span className="ml-0.5 text-base font-normal text-neutral-500 dark:text-neutral-400">
          {unit}
        </span>
      </span>
      <span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {delta}
      </span>
    </div>
  );
}

export function ProgressSummary({ weekly }: { weekly: WeeklyProgress }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
        今週のようす
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label="学習した日"
          value={weekly.activeDays}
          unit="日"
          delta={deltaText(weekly.activeDays, weekly.prevActiveDays, "日")}
        />
        <SummaryCard
          label="クリアした課題"
          value={weekly.clearedTasks}
          unit="問"
          delta={deltaText(weekly.clearedTasks, weekly.prevClearedTasks, "問")}
        />
      </div>
    </section>
  );
}
