import { and, eq, gte, lte, ne, sql } from "drizzle-orm";

import type {
  DashboardRepository,
  PeerCandidate,
} from "@/core/ports/dashboard-repository";
import { getDb } from "@/infra/db/client";
import {
  encouragementMessages,
  profiles,
  submissions,
  taskProgress,
  users,
} from "@/infra/db/schema";

/** 'YYYY-MM-DD' を UTC 日の下限 (00:00 その日) の Date に。 */
function startOfDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** 'YYYY-MM-DD' を UTC 日の上限 (翌日 00:00 の直前) の Date に。範囲は両端含みで扱う。 */
function endOfDay(day: string): Date {
  return new Date(`${day}T23:59:59.999Z`);
}

/**
 * Drizzle 実装の DashboardRepository。
 * すべて集計の読み取り専用。ログ系テーブルへは書き込まない。
 * 日付は UTC で切り出し、core (progress-service) の 'YYYY-MM-DD' (UTC) と揃える。
 */
export class DrizzleDashboardRepository implements DashboardRepository {
  async listSubmissionDays(
    userId: string,
    fromDay: string,
    toDay: string,
  ): Promise<Record<string, number>> {
    const rows = await getDb()
      .select({
        day: sql<string>`to_char(${submissions.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, userId),
          gte(submissions.createdAt, startOfDay(fromDay)),
          lte(submissions.createdAt, endOfDay(toDay)),
        ),
      )
      .groupBy(sql`1`);

    const out: Record<string, number> = {};
    for (const row of rows) out[row.day] = row.count;
    return out;
  }

  async listClearDays(
    userId: string,
    fromDay: string,
    toDay: string,
  ): Promise<Record<string, number>> {
    const rows = await getDb()
      .select({
        day: sql<string>`to_char(${taskProgress.firstClearedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(taskProgress)
      .where(
        and(
          eq(taskProgress.userId, userId),
          eq(taskProgress.isCleared, true),
          gte(taskProgress.firstClearedAt, startOfDay(fromDay)),
          lte(taskProgress.firstClearedAt, endOfDay(toDay)),
        ),
      )
      .groupBy(sql`1`);

    const out: Record<string, number> = {};
    for (const row of rows) out[row.day] = row.count;
    return out;
  }

  async countClearedTasks(userId: string): Promise<number> {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(taskProgress)
      .where(
        and(eq(taskProgress.userId, userId), eq(taskProgress.isCleared, true)),
      );
    return rows[0]?.count ?? 0;
  }

  async listPeerCandidates(excludeUserId: string): Promise<PeerCandidate[]> {
    const rows = await getDb()
      .select({
        userId: users.id,
        displayName: users.displayName,
        clearedCount: sql<number>`count(${taskProgress.id})::int`,
        lastActiveOn: profiles.lastActiveOn,
      })
      .from(users)
      .leftJoin(
        taskProgress,
        and(
          eq(taskProgress.userId, users.id),
          eq(taskProgress.isCleared, true),
        ),
      )
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(ne(users.id, excludeUserId))
      .groupBy(users.id, users.displayName, profiles.lastActiveOn);

    return rows.map((row) => ({
      userId: row.userId,
      displayName: row.displayName,
      clearedCount: row.clearedCount,
      lastActiveOn: row.lastActiveOn,
    }));
  }

  async countUnreadEncouragement(userId: string): Promise<number> {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(encouragementMessages)
      .where(
        and(
          eq(encouragementMessages.recipientId, userId),
          eq(encouragementMessages.isRead, false),
        ),
      );
    return rows[0]?.count ?? 0;
  }
}
