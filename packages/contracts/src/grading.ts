import { z } from "zod";

import { TaskSchema } from "./course";
import { AxisResultSchema, SubmissionResultSchema } from "./submission";

/**
 * 採点エンジンへの入力。
 * grader は Next.js も DB も知らない純粋な部品であるため、
 * DB から取得済みのデータをここで受け取る。
 */
export const GradingInputSchema = z.object({
  taskId: z.string(),
  /** ユーザーが提出したコード。ファイルパスをキーにしたコード片。 */
  submittedCode: z.record(z.string(), z.string()),
  /** 退化チェック対象の過去課題。 */
  previousTasks: z.array(TaskSchema),
  /**
   * 過去課題の模範実装。taskId をキーにした Record<filepath, code>。
   * 退化検出時に過去課題を模範実装で差し替えるために使う。
   */
  previousReferenceImpls: z.record(
    z.string(),
    z.record(z.string(), z.string()),
  ),
});
export type GradingInput = z.infer<typeof GradingInputSchema>;

/** 採点エンジンの出力。呼び出し元がこれを Submission として永続化する。 */
export const GradingOutputSchema = z.object({
  result: SubmissionResultSchema,
  axisResults: z.array(AxisResultSchema),
  degradedTasks: z.array(z.string()).nullable(),
  elapsedMs: z.number().int().nonnegative(),
});
export type GradingOutput = z.infer<typeof GradingOutputSchema>;
