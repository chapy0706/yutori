import { z } from "zod";

export const CourseSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  orderIndex: z.number().int().nonnegative(),
  playableBuildPath: z.string().nullable(),
  /** 完成形の仕様。Zod スキーマ定義を JSON 化して保持。 */
  finalSpec: z.unknown(),
  isPublished: z.boolean(),
  createdAt: z.date(),
});
export type Course = z.infer<typeof CourseSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  /** コース内の並び順。Walking Skeleton 思想により、orderIndex が小さいほど薄い骨組みを担う。 */
  orderIndex: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  /** この課題で評価対象となるファイルパスのリスト。 */
  targetFiles: z.array(z.string()).min(1),
  /** 契約観点・仕様観点の採点根拠となる Zod スキーマ定義の JSON 表現。 */
  contractSchema: z.unknown(),
  timeBudgetMs: z.number().int().positive(),
  goalMediaPath: z.string().nullable(),
  /** ハイブリッド合成用の模範実装。ファイルパスをキーにしたコード片。 */
  referenceImpl: z.record(z.string(), z.string()),
  createdAt: z.date(),
});
export type Task = z.infer<typeof TaskSchema>;
