"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * 並走者・ランキング表示の ON/OFF トグル。
 *
 * 設定 (profiles.showRanking) を /api/profile へ保存し、サーバーコンポーネントを
 * 再取得して表示を切り替える。楽観的に見た目を先に変え、失敗したら元に戻す。
 */
export function RankingToggle({ initialOn }: { initialOn: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [pending, startTransition] = useTransition();

  async function toggle() {
    const next = !on;
    setOn(next);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ showRanking: next }),
      });
      if (!res.ok) throw new Error("failed");
      startTransition(() => router.refresh());
    } catch {
      // 保存に失敗したら見た目を戻す (状態を偽らない)。
      setOn(!next);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="並走者・ランキングを表示"
      disabled={pending}
      onClick={toggle}
      className="inline-flex items-center gap-2 text-xs text-neutral-500 disabled:opacity-60 dark:text-neutral-400"
    >
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          on ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
            on ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
      {on ? "表示中" : "非表示"}
    </button>
  );
}
