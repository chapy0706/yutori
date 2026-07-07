import Link from "next/link";
import { notFound } from "next/navigation";

import { loadCourseDetail } from "@/core/learning/course-service";
import { getViewerUserId } from "@/infra/auth/current-user";
import {
  getCourseRepository,
  getProgressRepository,
} from "@/infra/repositories";
import { TaskList } from "@/ui/components/course/task-list";

/**
 * コース詳細 (課題一覧) ページ。各課題の進捗状態を表示し、課題ページへ遷移する。
 * ゴール提示 Level 1 (完成版を遊ぶ) への導線も置く。
 */
export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const userId = await getViewerUserId();
  const detail = await loadCourseDetail(
    getCourseRepository(),
    getProgressRepository(),
    { slug, userId },
  );

  if (detail === null) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/courses"
        className="text-sm text-neutral-500 hover:underline dark:text-neutral-400"
      >
        コース一覧へ
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          {detail.course.title}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {detail.course.description}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href={`/play/${detail.course.slug}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            完成版を遊ぶ
          </Link>
          {!detail.unlocked && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              作る権利はまだロック中。最初のコースをクリアすると解放されるよ。
            </span>
          )}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          課題
        </h2>
        <TaskList courseSlug={detail.course.slug} items={detail.tasks} />
      </section>
    </div>
  );
}
