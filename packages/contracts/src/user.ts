import { z } from "zod";

/**
 * アニメーション設定。null はシステム（OS の prefers-reduced-motion）に従う。
 * 主体性原則に基づき、ユーザーが上書きしない限りOS設定を尊重する。
 */
export const MotionPreferenceSchema = z.enum(["full", "reduced", "off"]);
export type MotionPreference = z.infer<typeof MotionPreferenceSchema>;

/**
 * 認証の主体。Supabase Auth の user id を参照する薄い存在。
 * 認証情報そのもの（パスワード等）は Auth 側が管理する。
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1),
  createdAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

/**
 * ユーザーの学習設定と状態。User と 1対1。
 * 認証アイデンティティ（不変）と設定・状態（可変）の関心を分離するため別定義。
 */
export const ProfileSchema = z.object({
  userId: z.string().uuid(),
  /** 主体性原則に基づき、音はデフォルト false。 */
  bgmEnabled: z.boolean(),
  seEnabled: z.boolean(),
  /** null は OS 設定に従う。 */
  motionPreference: MotionPreferenceSchema.nullable(),
  showRanking: z.boolean(),
  coinBalance: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  /** 'YYYY-MM-DD' 形式。草・連続日数の判定用。 */
  lastActiveOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/**
 * プロフィール設定の更新入力 (境界での検証用)。
 * いまは並走者・ランキング表示の ON/OFF のみを扱う (issue-10)。
 */
export const ProfileUpdateSchema = z.object({
  showRanking: z.boolean(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;
