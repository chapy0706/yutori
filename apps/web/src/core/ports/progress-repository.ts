/**
 * 到達状態 (task_progress) の読み書き口。
 *
 * task_progress は「現在地」を表すログ系ではないテーブルで、upsert してよい。
 * (ログ系である submissions とは扱いが異なる。)
 */
/** 課題ごとの到達状態のスナップショット (一覧表示・アンロック判定用)。 */
export type ProgressSnapshot = {
  isCleared: boolean;
  attemptCount: number;
};

export interface ProgressRepository {
  /** エディタに復元する作業中コード。未着手なら null。 */
  findWorkingCode(
    userId: string,
    taskId: string,
  ): Promise<Record<string, string> | null>;

  /** 指定課題群の到達状態をまとめて返す。未着手の課題はキーを持たない。 */
  listProgress(
    userId: string,
    taskIds: string[],
  ): Promise<Record<string, ProgressSnapshot>>;

  /** 作業中コードだけを保存する (自動保存・離脱時保存)。 */
  saveWorkingCode(
    userId: string,
    taskId: string,
    workingCode: Record<string, string>,
  ): Promise<void>;

  /**
   * 提出 1 回分の到達状態を反映する。試行回数を増やし、初回クリアを記録する。
   */
  recordAttempt(input: {
    userId: string;
    taskId: string;
    cleared: boolean;
    workingCode: Record<string, string>;
  }): Promise<void>;
}
