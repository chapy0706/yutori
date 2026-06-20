import { z } from "zod";

/** 採点の5観点。チェックはこの順番で上から行い、失敗した時点で打ち切る。 */
export const TestAxisSchema = z.enum([
  "structure",
  "contract",
  "basic",
  "spec",
  "robustness",
]);
export type TestAxis = z.infer<typeof TestAxisSchema>;

/**
 * テストケースの payload。観点ごとに内容は異なるが、共通の外枠を持つ。
 * DB の jsonb カラムに格納し、型は Zod で保証する。
 * 観点の増減が DB マイグレーション不要になる設計。
 */
export const TestCasePayloadSchema = z.object({
  /** 関数への入力値。型は課題ごとに異なるため unknown。 */
  input: z.unknown(),
  /** 期待値の Zod スキーマ定義（JSON 化）。値ではなく仕様への適合で採点する。 */
  expectedSchema: z.unknown(),
  /** 失敗時のテスト固有ヒント。null の場合はパターン辞書にフォールバック。 */
  onFailHint: z.string().nullable(),
});
export type TestCasePayload = z.infer<typeof TestCasePayloadSchema>;

export const TestCaseSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  axis: TestAxisSchema,
  /** 同一観点内での実行順序。 */
  orderIndex: z.number().int().nonnegative(),
  payload: TestCasePayloadSchema,
});
export type TestCase = z.infer<typeof TestCaseSchema>;
