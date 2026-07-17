/**
 * 未読の応援メッセージがある旨の表示。
 *
 * 「開くと良いことがありそう」という獲得期待に寄せた気配だけを置く
 * (件数を煽らず、そっと届いていることを伝える。ADR-0006)。
 * 未読が無ければ何も表示しない。
 */
export function CheerNotice({ unreadCount }: { unreadCount: number }) {
  if (unreadCount <= 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      未読の応援が {unreadCount} 件届いてるよ。
    </div>
  );
}
