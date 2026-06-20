import { z } from "zod";

/** Cosmetic アイテムの種別。学習スペースをカスタマイズする4種類。 */
export const CosmeticKindSchema = z.enum(["background", "icon", "bgm", "se"]);
export type CosmeticKind = z.infer<typeof CosmeticKindSchema>;

/** Cosmetic アイテムの入手経路。 */
export const AcquisitionSourceSchema = z.enum([
  "coin",
  "task_clear",
  "course_clear",
]);
export type AcquisitionSource = z.infer<typeof AcquisitionSourceSchema>;

/** アンロック可能な装飾アイテムのカタログエントリ。 */
export const CosmeticItemSchema = z.object({
  id: z.string(),
  kind: CosmeticKindSchema,
  name: z.string().min(1),
  assetPath: z.string(),
  /** null の場合、コインでは購入できず課題/コース完走でのみ入手可能。 */
  coinCost: z.number().int().positive().nullable(),
});
export type CosmeticItem = z.infer<typeof CosmeticItemSchema>;

/** ユーザーが所有する Cosmetic。入手経路も保持し、完走記念バッジの役割も担う。 */
export const UserInventoryItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  source: AcquisitionSourceSchema,
  acquiredAt: z.date(),
});
export type UserInventoryItem = z.infer<typeof UserInventoryItemSchema>;

/** 現在装備中の Cosmetic セット。「今の学習スペース」の構成を表す。 */
export const UserLoadoutSchema = z.object({
  userId: z.string(),
  backgroundItemId: z.string().nullable(),
  iconItemId: z.string().nullable(),
  bgmItemId: z.string().nullable(),
  seItemId: z.string().nullable(),
});
export type UserLoadout = z.infer<typeof UserLoadoutSchema>;
