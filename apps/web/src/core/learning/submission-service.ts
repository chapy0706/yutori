import type { GradingOutput } from "@yutori/contracts";

import type { ProgressRepository } from "@/core/ports/progress-repository";
import type { SubmissionRepository } from "@/core/ports/submission-repository";

/**
 * 採点結果を永続化する UseCase。
 *
 * 採点そのものはクライアント側 (Worker + grader) が済ませ、ここではその結果の
 * メタデータを保存するだけ (ADR-0002 のハイブリッド方式)。副作用は 2 つ:
 *   1. submissions への追記 (ログ系・INSERT のみ)
 *   2. task_progress の更新 (現在地・upsert)
 */
export async function recordSubmission(
  submissions: SubmissionRepository,
  progress: ProgressRepository,
  input: {
    userId: string;
    taskId: string;
    submittedCode: Record<string, string>;
    output: GradingOutput;
  },
): Promise<{ submissionId: string }> {
  const { userId, taskId, submittedCode, output } = input;

  const { id } = await submissions.append({
    userId,
    taskId,
    result: output.result,
    submittedCode,
    axisResults: output.axisResults,
    degradedTasks: output.degradedTasks,
    elapsedMs: output.elapsedMs,
  });

  await progress.recordAttempt({
    userId,
    taskId,
    cleared: output.result === "passed",
    workingCode: submittedCode,
  });

  return { submissionId: id };
}
