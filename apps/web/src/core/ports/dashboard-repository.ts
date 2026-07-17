/**
 * ダッシュボードの読み取りモデル (草・週次サマリ・並走者候補・未読応援)。
 *
 * すべて集計の読み取り専用。ログ系テーブル (submissions・daily_bonuses・
 * encouragement_messages) へは、この口から一切書き込まない (追記も更新もしない)。
 */

/**
 * 並走者候補の要約。
 *
 * 「進度の近さ」の判定に必要な最小限だけを持つ。個人特定情報は載せない
 * (displayName はユーザーが自ら公開している表示名で、匿名性の対象ではない)。
 */
export type PeerCandidate = {
  userId: string;
  displayName: string;
  /** これまでにクリアした課題のユニーク数。近さの基準。 */
  clearedCount: number;
  /** 最終学習日 ('YYYY-MM-DD')。未学習なら null。 */
  lastActiveOn: string | null;
};

export interface DashboardRepository {
  /**
   * 期間内の日ごとの提出数。'YYYY-MM-DD' -> 件数 (0 の日はキーを持たない)。
   * 草の濃淡と、学習日数の判定に使う。fromDay・toDay はともに含む (inclusive)。
   */
  listSubmissionDays(
    userId: string,
    fromDay: string,
    toDay: string,
  ): Promise<Record<string, number>>;

  /**
   * 期間内に初めてクリアした課題数。'YYYY-MM-DD' -> 件数。
   * 週次サマリの「クリア課題数」に使う。fromDay・toDay はともに含む。
   */
  listClearDays(
    userId: string,
    fromDay: string,
    toDay: string,
  ): Promise<Record<string, number>>;

  /** これまでにクリアした課題のユニーク総数 (草の見出し統計・並走者の近さ基準)。 */
  countClearedTasks(userId: string): Promise<number>;

  /** 自分以外の並走者候補。近さの選定は core/social が行う (ここは候補の供給のみ)。 */
  listPeerCandidates(excludeUserId: string): Promise<PeerCandidate[]>;

  /** 未読の応援メッセージ数。 */
  countUnreadEncouragement(userId: string): Promise<number>;
}
