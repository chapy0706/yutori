import { z } from "zod";

import { TestAxisSchema } from "./test-case";

/** 一回の提出に対する最終的な採点結果。 */
export const SubmissionResultSchema = z.enum([
  "passed",
  "partial",
  "failed",
  "error",
]);
export type SubmissionResult = z.infer<typeof SubmissionResultSchema>;

/** 一つの観点に対する採点結果。 */
export const AxisResultSchema = z.object({
  axis: TestAxisSchema,
  passed: z.boolean(),
  /** 失敗したテストケースの orderIndex。passed が true なら null。 */
  failedTestIndex: z.number().int().nonnegative().nullable(),
  /** 失敗時のヒント文字列。passed が true なら null。 */
  hint: z.string().nullable(),
});
export type AxisResult = z.infer<typeof AxisResultSchema>;

export const SubmissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  taskId: z.string(),
  result: SubmissionResultSchema,
  /** 提出時点のユーザーコード一式。ファイルパスをキーにしたコード片。 */
  submittedCode: z.record(z.string(), z.string()),
  axisResults: z.array(AxisResultSchema),
  /** 過去課題が壊れていて模範実装に差し替えた課題の ID リスト。 */
  degradedTasks: z.array(z.string()).nullable(),
  elapsedMs: z.number().int().nonnegative().nullable(),
  createdAt: z.date(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

/** 課題ごとの到達状態。履歴（Submission）と分けて「現在地」を表す。 */
export const TaskProgressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  taskId: z.string(),
  isCleared: z.boolean(),
  attemptCount: z.number().int().nonnegative(),
  firstClearedAt: z.date().nullable(),
  /** エディタに表示中のユーザーコード。未着手なら null。 */
  workingCode: z.record(z.string(), z.string()).nullable(),
  updatedAt: z.date(),
});
export type TaskProgress = z.infer<typeof TaskProgressSchema>;
