import { claimDailyBonus } from "@/core/reward/bonus-service";
import { resolvePersistenceUserId } from "@/infra/auth/current-user";
import { getRewardRepository } from "@/infra/repositories";

/**
 * デイリーボーナス (= ガチャ) の受領。1 日 1 回で、すでに引いていれば同じ結果を返す。
 * 抽選・冪等判定・副作用は core (claimDailyBonus) に集約し、この層は薄く保つ。
 */
export async function POST(): Promise<Response> {
  const resolved = await resolvePersistenceUserId();
  if (!resolved.ok) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  try {
    const result = await claimDailyBonus(
      getRewardRepository(),
      resolved.userId,
      new Date(),
    );
    return Response.json(result, { status: 200 });
  } catch {
    return Response.json({ error: "failed to claim" }, { status: 500 });
  }
}
