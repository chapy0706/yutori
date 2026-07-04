import { z } from "zod";

import { SchemaDescriptorSchema } from "./schema-descriptor";

/**
 * 課題の contractSchema の JSON 表現 (関数契約記述子)。
 *
 * 構造観点 (エクスポートの有無) と契約観点 (引数・戻り値の型) の採点根拠。
 * どのファイルの、どの名前のエクスポートを、どんな引数・戻り値で評価するかを表す。
 */
export const ContractDescriptorSchema = z.object({
  /** 評価対象のエクスポート名。 */
  export: z.string().min(1),
  /**
   * エクスポートを import するファイルパス。
   * 省略時は task.targetFiles[0] を用いる。
   */
  file: z.string().optional(),
  /** 期待する各引数の型 (契約観点)。省略時は引数個数を検査しない。 */
  params: z.array(SchemaDescriptorSchema).optional(),
  /** 期待する戻り値の型 (契約観点)。省略時は戻り値の型検査をしない。 */
  returns: SchemaDescriptorSchema.optional(),
});
export type ContractDescriptor = z.infer<typeof ContractDescriptorSchema>;

/**
 * 境界 (Task.contractSchema は z.unknown) を検証して契約記述子へ変換する。
 * 不正な場合は例外を投げる (呼び出し側で採点エラーへ変換)。
 */
export function parseContract(contractSchema: unknown): ContractDescriptor {
  return ContractDescriptorSchema.parse(contractSchema);
}
