import type { TaskState } from "@/core/learning/course-service";

const STATE_META: Record<TaskState, { label: string; className: string }> = {
  untouched: {
    label: "未着手",
    className:
      "border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400",
  },
  attempting: {
    label: "挑戦中",
    className:
      "border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300",
  },
  cleared: {
    label: "クリア",
    className:
      "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300",
  },
};

/** 課題の到達状態 (未着手 / 挑戦中 / クリア) を示すバッジ。 */
export function TaskStateBadge({ state }: { state: TaskState }) {
  const meta = STATE_META[state];
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
