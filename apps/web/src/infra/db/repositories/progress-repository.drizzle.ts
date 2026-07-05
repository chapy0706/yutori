import { and, eq, sql } from "drizzle-orm";

import type { ProgressRepository } from "@/core/ports/progress-repository";
import { getDb } from "@/infra/db/client";
import { taskProgress } from "@/infra/db/schema";

/** jsonb (unknown) を Record<string,string> として検証する。境界の型の嘘を防ぐ。 */
function asCodeMap(value: unknown): Record<string, string> | null {
  if (value === null || typeof value !== "object") return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v !== "string") return null;
    out[k] = v;
  }
  return out;
}

/**
 * Drizzle 実装の ProgressRepository。
 * task_progress は「現在地」を表すため upsert してよい (ログ系ではない)。
 */
export class DrizzleProgressRepository implements ProgressRepository {
  async findWorkingCode(
    userId: string,
    taskId: string,
  ): Promise<Record<string, string> | null> {
    const rows = await getDb()
      .select({ workingCode: taskProgress.workingCode })
      .from(taskProgress)
      .where(
        and(eq(taskProgress.userId, userId), eq(taskProgress.taskId, taskId)),
      )
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : asCodeMap(row.workingCode);
  }

  async saveWorkingCode(
    userId: string,
    taskId: string,
    workingCode: Record<string, string>,
  ): Promise<void> {
    const now = new Date();
    await getDb()
      .insert(taskProgress)
      .values({ userId, taskId, workingCode, updatedAt: now })
      .onConflictDoUpdate({
        target: [taskProgress.userId, taskProgress.taskId],
        set: { workingCode, updatedAt: now },
      });
  }

  async recordAttempt(input: {
    userId: string;
    taskId: string;
    cleared: boolean;
    workingCode: Record<string, string>;
  }): Promise<void> {
    const now = new Date();
    const setBase = {
      attemptCount: sql`${taskProgress.attemptCount} + 1`,
      isCleared: sql`${taskProgress.isCleared} OR ${input.cleared}`,
      workingCode: input.workingCode,
      updatedAt: now,
    };
    const set = input.cleared
      ? {
          ...setBase,
          firstClearedAt: sql`COALESCE(${taskProgress.firstClearedAt}, ${now})`,
        }
      : setBase;

    await getDb()
      .insert(taskProgress)
      .values({
        userId: input.userId,
        taskId: input.taskId,
        isCleared: input.cleared,
        attemptCount: 1,
        firstClearedAt: input.cleared ? now : null,
        workingCode: input.workingCode,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [taskProgress.userId, taskProgress.taskId],
        set,
      });
  }
}
