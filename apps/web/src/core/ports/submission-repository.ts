import type { AxisResult, SubmissionResult } from "@yutori/contracts";

/** 追記する提出レコード。ログ系のため INSERT のみで、更新・削除はしない。 */
export type NewSubmission = {
  userId: string;
  taskId: string;
  result: SubmissionResult;
  submittedCode: Record<string, string>;
  axisResults: AxisResult[];
  degradedTasks: string[] | null;
  elapsedMs: number | null;
};

/**
 * 提出記録 (submissions) の書き込み口。
 * submissions はログ系テーブルであり、追記のみ (UPDATE・DELETE 禁止)。
 */
export interface SubmissionRepository {
  append(submission: NewSubmission): Promise<{ id: string }>;
}
