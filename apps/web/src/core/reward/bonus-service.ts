import type { DailyBonusResult } from "@yutori/contracts";

import type {
  GachaContext,
  RewardRepository,
  StreakUpdate,
} from "@/core/ports/reward-repository";
import { diffDays, toDay } from "@/core/shared/day";

import { GACHA_CONFIG } from "./gacha-config";
import { type GachaSignals, rollGacha } from "./gacha-service";

/**
 * デイリーボーナス (= ガチャ) の受領 UseCase。
 *
 * ログインボーナスとガチャは一体で、「帰ってきた日の初回」に 1 回だけ引ける
 * (Auth.js の signIn は JWT では毎日発火しないため、契機は初回アクセスに置く)。
 * 損失回避は使わず、途切れてもペナルティを与えない (ADR-0006)。
 */

/** スキップ券を出してよいか。所持中と、使用後 3 ヶ月は出さない。 */
function isSkipEligible(context: GachaContext, now: Date): boolean {
  if (context.skipOwned) return false;
  if (context.skipLastUsedAt !== null) {
    const cutoff = new Date(now);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - GACHA_CONFIG.skipCooldownMonths);
    if (context.skipLastUsedAt > cutoff) return false;
  }
  return true;
}

/** context と now から、確率調整の signals を導く。 */
function deriveSignals(context: GachaContext, now: Date): GachaSignals {
  const today = toDay(now);
  const daysSinceLast =
    context.lastActiveOn === null
      ? Number.POSITIVE_INFINITY
      : diffDays(context.lastActiveOn, today);

  return {
    isBoostDay: GACHA_CONFIG.boosts.weekdayDays.includes(now.getUTCDay()),
    frequentLogin:
      context.recentLoginDays >= GACHA_CONFIG.frequent.thresholdDays,
    longAbsence: daysSinceLast >= GACHA_CONFIG.absentThresholdDays,
  };
}

/**
 * 連続ログイン日数を更新する。
 * 前日から続いていれば +1、間が空けば 1 に戻すだけ (ペナルティなし)。longest は保つ。
 */
function nextStreak(context: GachaContext, today: string): StreakUpdate {
  let current: number;
  if (context.lastActiveOn === null) {
    current = 1;
  } else {
    const gap = diffDays(context.lastActiveOn, today);
    if (gap <= 0) current = context.currentStreak;
    else if (gap === 1) current = context.currentStreak + 1;
    else current = 1;
  }
  return {
    currentStreak: current,
    longestStreak: Math.max(context.longestStreak, current),
    lastActiveOn: today,
  };
}

/**
 * 今日ぶんのデイリーボーナスを受領する。すでに引いていれば同じ結果を返す (冪等)。
 * rng は差し替え可能 (既定 Math.random)。
 */
export async function claimDailyBonus(
  repo: RewardRepository,
  userId: string,
  now: Date,
  rng?: () => number,
): Promise<DailyBonusResult> {
  const day = toDay(now);
  const [existing, context] = await Promise.all([
    repo.findBonusOn(userId, day),
    repo.loadGachaContext(userId, now),
  ]);

  if (existing !== null) {
    return {
      outcome: existing,
      alreadyClaimed: true,
      currentStreak: context.currentStreak,
      coinBalance: context.coinBalance,
    };
  }

  const outcome = rollGacha({
    signals: deriveSignals(context, now),
    ownableCosmetics: context.ownableCosmetics,
    skipEligible: isSkipEligible(context, now),
    rng,
  });
  const streak = nextStreak(context, day);
  const coinBalance =
    context.coinBalance + (outcome.kind === "coin" ? outcome.amount : 0);

  await repo.commitBonus({ userId, day, outcome, streak });

  return {
    outcome,
    alreadyClaimed: false,
    currentStreak: streak.currentStreak,
    coinBalance,
  };
}
