import type { GachaOutcome } from "@yutori/contracts";

/** ガチャで当てられる (まだ所持していない) Cosmetic の候補。 */
export type OwnableCosmetic = { id: string; name: string };

/**
 * ガチャ抽選に必要な状態のスナップショット。
 * 確率の動的調整 (裏設定) と、スキップ券の出現制御の材料になる。
 */
export type GachaContext = {
  coinBalance: number;
  currentStreak: number;
  longestStreak: number;
  /** 最終ログイン日 ('YYYY-MM-DD')。未ログインなら null。 */
  lastActiveOn: string | null;
  /** 直近の窓 (既定 14 日) でボーナスを受けた日数。ログイン頻度の signal。 */
  recentLoginDays: number;
  /** 未使用のスキップ券を所持しているか (所持中は再出現させない)。 */
  skipOwned: boolean;
  /** スキップ券の最終使用日時。未使用なら null (3 ヶ月制限の判定用)。 */
  skipLastUsedAt: Date | null;
  /** まだ所持していない Cosmetic 一覧 (cosmetic 当選時の抽選対象)。 */
  ownableCosmetics: OwnableCosmetic[];
};

/** 連続ログイン日数の更新結果 (途切れてもペナルティなし。ADR-0006)。 */
export type StreakUpdate = {
  currentStreak: number;
  longestStreak: number;
  lastActiveOn: string;
};

/** ガチャ結果の確定入力。副作用と履歴・ストリークをまとめて反映する。 */
export type CommitBonusInput = {
  userId: string;
  day: string;
  outcome: GachaOutcome;
  streak: StreakUpdate;
};

/**
 * 報酬 (デイリーボーナス=ガチャ・スキップ券) の永続化口。
 *
 * daily_bonuses はログ系のため追記のみ。skip_tickets の usedAt は「消費の確定」の
 * 1 回限りの更新に留める。profiles のコイン・ストリークは可変状態として upsert する。
 */
export interface RewardRepository {
  /** 指定日にすでに引いたガチャ結果。未取得なら null (1 日 1 回の冪等判定)。 */
  findBonusOn(userId: string, day: string): Promise<GachaOutcome | null>;

  /** 抽選に必要な状態をまとめて取得する。 */
  loadGachaContext(userId: string, now: Date): Promise<GachaContext>;

  /** 抽選結果を確定し、コイン/在庫/スキップ券・履歴・ストリークを反映する。 */
  commitBonus(input: CommitBonusInput): Promise<void>;

  /** 使用可能な (未使用の) スキップ券の枚数。 */
  countAvailableSkipTickets(userId: string): Promise<number>;

  /**
   * スキップ券 1 枚を消費して課題をクリア扱いにする。
   * 使える券が無ければ ok:false。券がある場合のみ課題を cleared にする。
   */
  useSkipTicket(
    userId: string,
    taskId: string,
    now: Date,
  ): Promise<{ ok: boolean }>;
}
