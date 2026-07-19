import { notFound } from "next/navigation";

import { loadTaskBundle } from "@/core/learning/course-service";
import { getViewerUserId } from "@/infra/auth/current-user";
import {
  getCourseRepository,
  getProgressRepository,
  getRewardRepository,
} from "@/infra/repositories";
import { SkipButton } from "@/ui/components/reward/skip-button";
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
  const userId = await getViewerUserId();

  const bundle = await loadTaskBundle(
    getCourseRepository(),
    getProgressRepository(),
    { slug, taskId, userId },
  );

  if (bundle === null) notFound();

  // スキップ券を持っていて、まだクリアしていない課題にだけ「使う」導線を出す。
  let skipTickets = 0;
  let alreadyCleared = false;
  if (userId !== null) {
    const [count, progress] = await Promise.all([
      getRewardRepository().countAvailableSkipTickets(userId),
      getProgressRepository().listProgress(userId, [bundle.task.id]),
    ]);
    skipTickets = count;
    alreadyCleared = progress[bundle.task.id]?.isCleared ?? false;
  }

  return (
    <div className="space-y-4">
      {skipTickets > 0 && !alreadyCleared && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-neutral-300 px-4 py-3 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            詰まったら、スキップ券でこの課題を飛ばしてもいいよ。
          </p>
          <SkipButton taskId={bundle.task.id} count={skipTickets} />
        </div>
      )}
      <TaskWorkspace
        course={bundle.course}
        task={bundle.task}
        testCases={bundle.testCases}
        previousTasks={bundle.previousTasks}
        previousReferenceImpls={bundle.previousReferenceImpls}
        workingCode={bundle.workingCode}
      />
    </div>
  );
}
