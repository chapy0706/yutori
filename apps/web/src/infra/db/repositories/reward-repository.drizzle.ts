import { type GachaOutcome, GachaOutcomeSchema } from "@yutori/contracts";
import { and, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";

import type {
  CommitBonusInput,
  GachaContext,
  RewardRepository,
} from "@/core/ports/reward-repository";
import { GACHA_CONFIG } from "@/core/reward/gacha-config";
import { addDays, toDay } from "@/core/shared/day";
import { getDb } from "@/infra/db/client";
import {
  cosmeticItems,
  dailyBonuses,
  profiles,
  skipTickets,
  taskProgress,
  userInventory,
} from "@/infra/db/schema";

/**
 * Drizzle 実装の RewardRepository。
 *
 * daily_bonuses はログ系のため追記のみ。二重付与を避けるため、確定時は insert の
 * 競合有無で受領済みを判定する。skip_tickets の usedAt は消費確定の 1 回限りの更新。
 * profiles のコイン・ストリークは可変状態として upsert する。
 * コインや在庫への波及を含むため、確定は必ずトランザクションで束ねる。
 */
export class DrizzleRewardRepository implements RewardRepository {
  async findBonusOn(userId: string, day: string): Promise<GachaOutcome | null> {
    const rows = await getDb()
      .select({ reward: dailyBonuses.reward })
      .from(dailyBonuses)
      .where(
        and(eq(dailyBonuses.userId, userId), eq(dailyBonuses.grantedOn, day)),
      )
      .limit(1);
    const row = rows[0];
    if (row === undefined) return null;
    const parsed = GachaOutcomeSchema.safeParse(row.reward);
    return parsed.success ? parsed.data : null;
  }

  async loadGachaContext(userId: string, now: Date): Promise<GachaContext> {
    const db = getDb();
    const sinceDay = addDays(
      toDay(now),
      -(GACHA_CONFIG.frequent.windowDays - 1),
    );

    const [profileRows, loginRows, ownedTicketRows, usedTicketRows, cosmetics] =
      await Promise.all([
        db
          .select({
            coinBalance: profiles.coinBalance,
            currentStreak: profiles.currentStreak,
            longestStreak: profiles.longestStreak,
            lastActiveOn: profiles.lastActiveOn,
          })
          .from(profiles)
          .where(eq(profiles.userId, userId))
          .limit(1),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(dailyBonuses)
          .where(
            and(
              eq(dailyBonuses.userId, userId),
              gte(dailyBonuses.grantedOn, sinceDay),
            ),
          ),
        db
          .select({ id: skipTickets.id })
          .from(skipTickets)
          .where(
            and(eq(skipTickets.userId, userId), isNull(skipTickets.usedAt)),
          )
          .limit(1),
        db
          .select({ usedAt: skipTickets.usedAt })
          .from(skipTickets)
          .where(
            and(eq(skipTickets.userId, userId), isNotNull(skipTickets.usedAt)),
          )
          .orderBy(desc(skipTickets.usedAt))
          .limit(1),
        db
          .select({ id: cosmeticItems.id, name: cosmeticItems.name })
          .from(cosmeticItems)
          .leftJoin(
            userInventory,
            and(
              eq(userInventory.itemId, cosmeticItems.id),
              eq(userInventory.userId, userId),
            ),
          )
          .where(isNull(userInventory.id)),
      ]);

    const profile = profileRows[0];

    return {
      coinBalance: profile?.coinBalance ?? 0,
      currentStreak: profile?.currentStreak ?? 0,
      longestStreak: profile?.longestStreak ?? 0,
      lastActiveOn: profile?.lastActiveOn ?? null,
      recentLoginDays: loginRows[0]?.count ?? 0,
      skipOwned: ownedTicketRows.length > 0,
      skipLastUsedAt: usedTicketRows[0]?.usedAt ?? null,
      ownableCosmetics: cosmetics.map((c) => ({ id: c.id, name: c.name })),
    };
  }

  async commitBonus(input: CommitBonusInput): Promise<void> {
    const { userId, day, outcome, streak } = input;
    const coinDelta = outcome.kind === "coin" ? outcome.amount : 0;

    await getDb().transaction(async (tx) => {
      // 追記 (ログ系)。すでに今日のぶんがあれば挿入されず、以降の波及も行わない。
      const inserted = await tx
        .insert(dailyBonuses)
        .values({ userId, grantedOn: day, reward: outcome })
        .onConflictDoNothing()
        .returning({ id: dailyBonuses.id });
      if (inserted.length === 0) return;

      await tx
        .insert(profiles)
        .values({
          userId,
          coinBalance: coinDelta,
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastActiveOn: streak.lastActiveOn,
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            coinBalance: sql`${profiles.coinBalance} + ${coinDelta}`,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastActiveOn: streak.lastActiveOn,
          },
        });

      if (outcome.kind === "cosmetic") {
        await tx
          .insert(userInventory)
          .values({ userId, itemId: outcome.itemId, source: "gacha" })
          .onConflictDoNothing();
      } else if (outcome.kind === "skip") {
        await tx.insert(skipTickets).values({ userId });
      }
    });
  }

  async countAvailableSkipTickets(userId: string): Promise<number> {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(skipTickets)
      .where(and(eq(skipTickets.userId, userId), isNull(skipTickets.usedAt)));
    return rows[0]?.count ?? 0;
  }

  async useSkipTicket(
    userId: string,
    taskId: string,
    now: Date,
  ): Promise<{ ok: boolean }> {
    return getDb().transaction(async (tx) => {
      const tickets = await tx
        .select({ id: skipTickets.id })
        .from(skipTickets)
        .where(and(eq(skipTickets.userId, userId), isNull(skipTickets.usedAt)))
        .orderBy(skipTickets.acquiredAt)
        .limit(1);
      const ticket = tickets[0];
      if (ticket === undefined) return { ok: false };

      await tx
        .update(skipTickets)
        .set({ usedAt: now, usedTaskId: taskId })
        .where(eq(skipTickets.id, ticket.id));

      await tx
        .insert(taskProgress)
        .values({
          userId,
          taskId,
          isCleared: true,
          attemptCount: 0,
          firstClearedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [taskProgress.userId, taskProgress.taskId],
          set: {
            isCleared: true,
            firstClearedAt: sql`COALESCE(${taskProgress.firstClearedAt}, ${now})`,
            updatedAt: now,
          },
        });

      return { ok: true };
    });
  }
}
