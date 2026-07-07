import Link from "next/link";

import type { CourseListItem } from "@/core/learning/course-service";

/**
 * コース一覧の 1 枚のカード。
 *
 * アンロック済みなら課題一覧へ進める。ロック中でも「遊ぶ」は常に可能
 * (ロックされるのは作る権利であって、見る・遊ぶ権利ではない)。
 */
export function CourseCard({ item }: { item: CourseListItem }) {
  const { course, unlocked } = item;
  return (
    <article className="flex h-full flex-col rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {course.title}
        </h2>
        {!unlocked && (
          <span className="shrink-0 rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            作る権利はロック中
          </span>
        )}
      </div>
      <p className="mt-1 flex-1 text-sm text-neutral-600 dark:text-neutral-300">
        {course.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {unlocked ? (
          <Link
            href={`/courses/${course.slug}`}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            課題へ
          </Link>
        ) : (
          <span className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-400 dark:border-neutral-800">
            最初のコースをクリアで解放
          </span>
        )}
        <Link
          href={`/play/${course.slug}`}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
        >
          遊ぶ
        </Link>
      </div>
    </article>
  );
}
