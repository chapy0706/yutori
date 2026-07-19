import type { GachaOutcome } from "@yutori/contracts";

import type {
  CommitBonusInput,
  GachaContext,
  OwnableCosmetic,
  RewardRepository,
} from "@/core/ports/reward-repository";
import { GACHA_CONFIG } from "@/core/reward/gacha-config";
import { addDays, toDay } from "@/core/shared/day";

import { markTaskClearedInMemory } from "./memory-repositories";

/**
 * DB を使わない fixture モード用の、報酬 (デイリーボーナス=ガチャ・スキップ券) の
 * インメモリ永続化。プロセスのメモリに保持するだけで再起動で消える。開発・検証用。
 *
 * ガチャが Cosmetic を当てられるよう、ダミーの Cosmetic カタログを用意する。
 */

/** fixture の Cosmetic カタログ (ガチャの cosmetic 枠の抽選対象)。 */
const FIXTURE_COSMETICS: OwnableCosmetic[] = [
  { id: "cos-forest", name: "森の背景" },
  { id: "cos-night", name: "夜空の背景" },
  { id: "cos-cat", name: "ねこアイコン" },
  { id: "cos-lofi", name: "lo-fi BGM" },
];

type RewardState = {
  coinBalance: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveOn: string | null;
};

type SkipTicket = {
  userId: string;
  acquiredAt: Date;
  usedAt: Date | null;
};

const rewardStateStore = new Map<string, RewardState>();
const dailyBonusStore = new Map<string, GachaOutcome>(); // key: userId::YYYY-MM-DD
const ownedCosmeticStore = new Map<string, Set<string>>(); // userId -> itemId 集合
const skipTicketStore: SkipTicket[] = [];

const bonusKey = (userId: string, day: string) => `${userId}::${day}`;

function stateOf(userId: string): RewardState {
  const existing = rewardStateStore.get(userId);
  if (existing !== undefined) return existing;
  const fresh: RewardState = {
    coinBalance: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveOn: null,
  };
  rewardStateStore.set(userId, fresh);
  return fresh;
}

export class MemoryRewardRepository implements RewardRepository {
  async findBonusOn(userId: string, day: string): Promise<GachaOutcome | null> {
    return dailyBonusStore.get(bonusKey(userId, day)) ?? null;
  }

  async loadGachaContext(userId: string, now: Date): Promise<GachaContext> {
    const state = stateOf(userId);

    const sinceDay = addDays(
      toDay(now),
      -(GACHA_CONFIG.frequent.windowDays - 1),
    );
    const prefix = `${userId}::`;
    let recentLoginDays = 0;
    for (const storeKey of dailyBonusStore.keys()) {
      if (!storeKey.startsWith(prefix)) continue;
      if (storeKey.slice(prefix.length) >= sinceDay) recentLoginDays += 1;
    }

    const tickets = skipTicketStore.filter((t) => t.userId === userId);
    const skipOwned = tickets.some((t) => t.usedAt === null);
    const usedTimes = tickets
      .filter((t) => t.usedAt !== null)
      .map((t) => (t.usedAt as Date).getTime());
    const skipLastUsedAt =
      usedTimes.length > 0 ? new Date(Math.max(...usedTimes)) : null;

    const owned = ownedCosmeticStore.get(userId) ?? new Set<string>();
    const ownableCosmetics = FIXTURE_COSMETICS.filter((c) => !owned.has(c.id));

    return {
      coinBalance: state.coinBalance,
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      lastActiveOn: state.lastActiveOn,
      recentLoginDays,
      skipOwned,
      skipLastUsedAt,
      ownableCosmetics,
    };
  }

  async commitBonus(input: CommitBonusInput): Promise<void> {
    dailyBonusStore.set(bonusKey(input.userId, input.day), input.outcome);

    const state = stateOf(input.userId);
    state.currentStreak = input.streak.currentStreak;
    state.longestStreak = input.streak.longestStreak;
    state.lastActiveOn = input.streak.lastActiveOn;

    if (input.outcome.kind === "coin") {
      state.coinBalance += input.outcome.amount;
    } else if (input.outcome.kind === "cosmetic") {
      const owned = ownedCosmeticStore.get(input.userId) ?? new Set<string>();
      owned.add(input.outcome.itemId);
      ownedCosmeticStore.set(input.userId, owned);
    } else {
      skipTicketStore.push({
        userId: input.userId,
        acquiredAt: new Date(),
        usedAt: null,
      });
    }
  }

  async countAvailableSkipTickets(userId: string): Promise<number> {
    return skipTicketStore.filter(
      (t) => t.userId === userId && t.usedAt === null,
    ).length;
  }

  async useSkipTicket(
    userId: string,
    taskId: string,
    now: Date,
  ): Promise<{ ok: boolean }> {
    const ticket = skipTicketStore.find(
      (t) => t.userId === userId && t.usedAt === null,
    );
    if (ticket === undefined) return { ok: false };
    ticket.usedAt = now;
    markTaskClearedInMemory(userId, taskId, toDay(now));
    return { ok: true };
  }
}
