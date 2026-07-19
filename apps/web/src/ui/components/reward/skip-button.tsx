"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * 課題スキップ券を使うボタン (課題ページ)。
 *
 * 券を 1 枚消費して、この課題をクリア扱いにする。詰まって疲れた人が、
 * 自分の意志で先へ進むための逃げ道 (焦らせない。ADR-0006)。
 * 券が無い・クリア済みの場合は呼び出し側で表示しない。
 */
export function SkipButton({
  taskId,
  count,
}: {
  taskId: string;
  count: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  async function use() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/skip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.status !== 204) throw new Error("failed");
      setUsed(true);
      startTransition(() => router.refresh());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (used) {
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-300">
        スキップ券でこの課題をクリアにしたよ。次へ進もう。
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={busy}
        onClick={use}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
      >
        {busy ? "使っているよ..." : `スキップ券を使う（残り ${count} 枚）`}
      </button>
      {failed && (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          使えなかったみたい。少し時間をおいて試してね。
        </p>
      )}
    </div>
  );
}
