import { eq } from "drizzle-orm";

import type { ProfileRepository } from "@/core/ports/profile-repository";
import { getDb } from "@/infra/db/client";
import { profiles } from "@/infra/db/schema";

/**
 * Drizzle 実装の ProfileRepository。
 * profiles は可変の設定テーブルのため upsert してよい (ログ系ではない)。
 */
export class DrizzleProfileRepository implements ProfileRepository {
  async getShowRanking(userId: string): Promise<boolean> {
    const rows = await getDb()
      .select({ showRanking: profiles.showRanking })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    // 未設定 (プロフィール未作成) は既定 true。
    return rows[0]?.showRanking ?? true;
  }

  async setShowRanking(userId: string, showRanking: boolean): Promise<void> {
    await getDb()
      .insert(profiles)
      .values({ userId, showRanking })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { showRanking },
      });
  }
}
