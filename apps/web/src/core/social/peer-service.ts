import type { PeerCandidate } from "@/core/ports/dashboard-repository";

/**
 * 並走者 (進度の近い学習者) の選定 UseCase。
 *
 * MVP の「進度の近さ」は、クリア済み課題数の差の小ささで定義する
 * (issue-10 の未決事項に対する暫定定義)。差が同じなら、少し先を歩く人を
 * 優先する (背中が見える方が励みになりやすい、という獲得志向。ADR-0006)。
 * 直近アクティブ日など多軸の近さは MVP 後の拡張とする。
 */

/** 既定で表示する並走者の人数。 */
export const DEFAULT_PEER_LIMIT = 3;

export type Peer = {
  userId: string;
  displayName: string;
  clearedCount: number;
  /** 自分との課題クリア数の差 (近さ)。0 なら同じ進度。 */
  diff: number;
  /** 自分より先を歩いているか (clearedCount が多いか)。 */
  ahead: boolean;
};

/**
 * 候補から、自分と進度の近い数人を選ぶ。
 * 差が小さい順、同差なら少し先を歩く人 (clearedCount が多い方) を先に並べる。
 */
export function pickPeers(
  candidates: PeerCandidate[],
  viewerClearedCount: number,
  limit: number = DEFAULT_PEER_LIMIT,
): Peer[] {
  return candidates
    .map((candidate) => ({
      userId: candidate.userId,
      displayName: candidate.displayName,
      clearedCount: candidate.clearedCount,
      diff: Math.abs(candidate.clearedCount - viewerClearedCount),
      ahead: candidate.clearedCount > viewerClearedCount,
    }))
    .sort((a, b) => a.diff - b.diff || b.clearedCount - a.clearedCount)
    .slice(0, limit);
}
