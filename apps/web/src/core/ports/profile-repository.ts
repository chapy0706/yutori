/**
 * 学習設定 (profiles) の読み書き口。
 *
 * profiles は「現在の設定・状態」を表す可変テーブルで、upsert してよい
 * (ログ系ではない)。この issue では並走者・ランキング表示の ON/OFF のみ扱う。
 */
export interface ProfileRepository {
  /** 並走者・ランキングを表示するか。未設定は既定 true。 */
  getShowRanking(userId: string): Promise<boolean>;

  /** 並走者・ランキング表示の ON/OFF を保存する。 */
  setShowRanking(userId: string, showRanking: boolean): Promise<void>;
}
