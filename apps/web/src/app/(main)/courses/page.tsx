import { listCourses } from "@/core/learning/course-service";
import { getViewerUserId } from "@/infra/auth/current-user";
import {
  getCourseRepository,
  getProgressRepository,
} from "@/infra/repositories";
import { CourseCard } from "@/ui/components/course/course-card";

/**
 * コース一覧ページ。アンロック状態つきで公開コースを並べる。
 * データ取得は UseCase (listCourses) に委ね、フレームワーク層は薄く保つ。
 */
export default async function CoursesPage() {
  const userId = await getViewerUserId();
  const items = await listCourses(
    getCourseRepository(),
    getProgressRepository(),
    userId,
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          コース
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          作りながら学ぶ。まずは最初のコースから、ひとつずつ。
        </p>
      </header>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          公開中のコースはまだないよ。
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CourseCard key={item.course.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
