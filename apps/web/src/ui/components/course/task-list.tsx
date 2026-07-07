import Link from "next/link";

import type { TaskListItem } from "@/core/learning/course-service";

import { TaskStateBadge } from "./task-state-badge";

/**
 * コース内の課題一覧。各課題の到達状態を示し、課題ページへ遷移する。
 * ゴール提示 (Level 2) として、課題ごとのゴール画像があれば添える。
 */
export function TaskList({
  courseSlug,
  items,
}: {
  courseSlug: string;
  items: TaskListItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        このコースの課題は準備中だよ。
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map(({ task, state }, index) => (
        <li key={task.id}>
          <Link
            href={`/courses/${courseSlug}/tasks/${task.id}`}
            className="flex items-center gap-3 rounded-md border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <span className="text-sm text-neutral-400 tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            {task.goalMediaPath !== null && (
              // 課題ごとのゴール提示 (Level 2) のサムネイル。
              <img
                src={task.goalMediaPath}
                alt={`${task.title} のゴール`}
                className="h-10 w-16 shrink-0 rounded border border-neutral-200 object-cover dark:border-neutral-800"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                {task.title}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {task.description}
              </p>
            </div>
            <TaskStateBadge state={state} />
          </Link>
        </li>
      ))}
    </ol>
  );
}
