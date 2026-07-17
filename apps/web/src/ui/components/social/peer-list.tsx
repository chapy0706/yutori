import type { Peer } from "@/core/social/peer-service";

/**
 * 並走者リスト (進度の近い数人)。
 *
 * 競争ではなく「同じくらいのペースで歩いている人がいる」という安心のための表示。
 * 個人特定情報は載せず、表示名とクリア数だけを見せる。少し先を歩く人には
 * そっと背中が見える程度の言い添えをする (煽らない。ADR-0006)。
 */
function nearnessLabel(peer: Peer): string {
  if (peer.diff === 0) return "同じくらいのペース";
  if (peer.ahead) return "少し先を歩いてる";
  return "すぐ後ろを歩いてる";
}

export function PeerList({ peers }: { peers: Peer[] }) {
  if (peers.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        いまは近くを歩く人がまだいないよ。あなたのペースで大丈夫。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {peers.map((peer) => (
        <li
          key={peer.userId}
          className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"
        >
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {peer.displayName}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {nearnessLabel(peer)}
            </span>
          </div>
          <span className="shrink-0 text-sm text-neutral-600 tabular-nums dark:text-neutral-300">
            {peer.clearedCount} 問クリア
          </span>
        </li>
      ))}
    </ul>
  );
}
