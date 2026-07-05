import { notFound } from "next/navigation";

import { loadTaskBundle } from "@/core/learning/course-service";
import { getCurrentUserId } from "@/infra/auth/current-user";
import {
  getCourseRepository,
  getProgressRepository,
} from "@/infra/repositories";
import { TaskWorkspace } from "@/ui/components/task/task-workspace";

/**
 * 課題ページ。エディタ・採点実行・リアルタイム進捗の中心画面。
 *
 * フレームワーク層として薄く保つ: データ取得は UseCase (loadTaskBundle) に委ね、
 * 採点・表示は Client Component (TaskWorkspace) に委ねる。
 */
export default async function TaskPage({
  params,
}: {
  params: Promise<{ slug: string; taskId: string }>;
}) {
  const { slug, taskId } = await params;
  const userId = await getCurrentUserId();

  const bundle = await loadTaskBundle(
    getCourseRepository(),
    getProgressRepository(),
    { slug, taskId, userId },
  );

  if (bundle === null) notFound();

  return (
    <TaskWorkspace
      course={bundle.course}
      task={bundle.task}
      testCases={bundle.testCases}
      previousTasks={bundle.previousTasks}
      previousReferenceImpls={bundle.previousReferenceImpls}
      workingCode={bundle.workingCode}
    />
  );
}
