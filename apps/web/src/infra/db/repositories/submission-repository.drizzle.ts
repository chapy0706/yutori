import type {
  NewSubmission,
  SubmissionRepository,
} from "@/core/ports/submission-repository";
import { getDb } from "@/infra/db/client";
import { submissions } from "@/infra/db/schema";

/**
 * Drizzle 実装の SubmissionRepository。
 * submissions はログ系テーブルのため、INSERT のみを行う (UPDATE・DELETE 禁止)。
 */
export class DrizzleSubmissionRepository implements SubmissionRepository {
  async append(submission: NewSubmission): Promise<{ id: string }> {
    const rows = await getDb()
      .insert(submissions)
      .values({
        userId: submission.userId,
        taskId: submission.taskId,
        result: submission.result,
        submittedCode: submission.submittedCode,
        axisResults: submission.axisResults,
        degradedTasks: submission.degradedTasks,
        elapsedMs: submission.elapsedMs,
      })
      .returning({ id: submissions.id });

    const row = rows[0];
    if (row === undefined) {
      throw new Error("submission の追記に失敗しました");
    }
    return { id: row.id };
  }
}
