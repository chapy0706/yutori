"use client";

import { DailyBonusResultSchema, type GachaOutcome } from "@yutori/contracts";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * デイリーボーナス (= ガチャ) の受領 UI。
 *
 * 「開くと良いことがありそう」という獲得期待のための、そっとした 1 日 1 回のおくりもの
 * (ADR-0006)。まだ引いていなければボタンを、引いていれば結果を出す。周辺の数値
 * (コイン・ストリーク・スキップ券) はサーバー側で描画し、引いた後に router.refresh で更新する。
 */

function outcomeText(outcome: GachaOutcome): string {
  switch (outcome.kind) {
    case "coin":
      return `コインを ${outcome.amount} 枚もらったよ。`;
    case "cosmetic":
      return `「${outcome.name}」を手に入れたよ。`;
    default:
      return "課題スキップ券を手に入れたよ。";
  }
}

export function DailyGacha({
  initialClaimed,
  initialOutcome,
}: {
  initialClaimed: boolean;
  initialOutcome: GachaOutcome | null;
}) {
  const router = useRouter();
  const [pulledOutcome, setPulledOutcome] = useState<GachaOutcome | null>(null);
  const [pulling, setPulling] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  const shownOutcome = pulledOutcome ?? initialOutcome;
  const claimed = initialClaimed || pulledOutcome !== null;

  async function pull() {
    setPulling(true);
    setFailed(false);
    try {
      const res = await fetch("/api/bonus", { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const parsed = DailyBonusResultSchema.safeParse(await res.json());
      if (!parsed.success) throw new Error("invalid response");
      setPulledOutcome(parsed.data.outcome);
      startTransition(() => router.refresh());
    } catch {
      setFailed(true);
    } finally {
      setPulling(false);
    }
  }

  if (claimed && shownOutcome !== null) {
    return (
      <p className="text-sm text-neutral-700 dark:text-neutral-200">
        今日のおくりもの: {outcomeText(shownOutcome)} また明日ね。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pulling}
        onClick={pull}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pulling ? "引いているよ..." : "今日のおくりものを受け取る"}
      </button>
      {failed && (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          うまくいかなかったみたい。少し時間をおいて試してね。
        </p>
      )}
    </div>
  );
}
