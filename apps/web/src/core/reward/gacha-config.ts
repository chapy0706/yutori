/**
 * ガチャの調整つまみ (すべてここに集約)。
 *
 * 具体的な数値は「運用しながら調整する」前提の暫定値 (issue-11)。
 * 動的調整・曜日ブーストは「気づかれない程度のそっとした恵み」に留め、
 * 引き込みの強さより消耗しないことを優先する (ADR-0006)。
 */
export const GACHA_CONFIG = {
  /** コイン当選時の付与量 (小口 / 大口)。 */
  coin: { small: 10, large: 50 },

  /**
   * 各枠の基本重み (相対値)。skip は明確に低確率枠。
   * cosmetic は未所持がある時のみ、skip は出現条件を満たす時のみ有効になる。
   */
  baseWeights: {
    coinSmall: 60,
    coinLarge: 25,
    cosmetic: 14,
    skip: 1,
  },

  /** 「良い枠」(cosmetic / skip) に掛かる、控えめな上振れ係数。 */
  boosts: {
    /** 水曜・土曜。getUTCDay: 0=日, 3=水, 6=土。 */
    weekdayDays: [3, 6] as readonly number[],
    weekdayFactor: 1.5,
    /** ログイン頻度が高い人へ、そっと上げる。 */
    frequentFactor: 1.2,
    /** 久しぶりの人へ、そっと上げる。 */
    absentFactor: 1.2,
  },

  /** ログイン頻度の signal のしきい値。 */
  frequent: { windowDays: 14, thresholdDays: 5 },

  /** 「久しぶり」とみなす最終ログインからの経過日数。 */
  absentThresholdDays: 7,

  /** スキップ券の再出現を止める期間 (使用後)。 */
  skipCooldownMonths: 3,
} as const;
