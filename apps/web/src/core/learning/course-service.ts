import type { CourseRepository } from "@/core/ports/course-repository";
import type { ProgressRepository } from "@/core/ports/progress-repository";

import type { TaskBundle } from "./task-bundle";

/**
 * 課題ページの表示・採点に必要なデータ束を組み立てる UseCase。
 *
 * Route Handler や Component にこのロジックを書かず、ここへ集約する。
 * 依存 (リポジトリ) は port 経由で受け取り、DB や Next.js を直接触らない。
 */
export async function loadTaskBundle(
  courses: CourseRepository,
  progress: ProgressRepository | null,
  params: { slug: string; taskId: string; userId: string | null },
): Promise<TaskBundle | null> {
  const course = await courses.findCourseBySlug(params.slug);
  if (course === null) return null;

  const task = await courses.findTask(course.id, params.taskId);
  if (task === null) return null;

  const [testCases, previousTasks] = await Promise.all([
    courses.findTestCases(task.id),
    courses.findPreviousTasks(course.id, task.orderIndex),
  ]);

  const previousReferenceImpls: Record<
    string,
    Record<string, string>
  > = Object.fromEntries(
    previousTasks.map((previous) => [previous.id, previous.referenceImpl]),
  );

  const workingCode =
    params.userId !== null && progress !== null
      ? await progress.findWorkingCode(params.userId, task.id)
      : null;

  return {
    course,
    task,
    testCases,
    previousTasks,
    previousReferenceImpls,
    workingCode,
  };
}
