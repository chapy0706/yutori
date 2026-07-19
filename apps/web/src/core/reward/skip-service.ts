import type { RewardRepository } from "@/core/ports/reward-repository";

/**
 * スキップ券の使用 UseCase。
 *
 * 券を 1 枚消費し、対象課題をクリア扱いにする。券が無ければ何もしない。
 * 「所持の確認 → 消費 → 課題クリア」の原子性はリポジトリ実装が担保する。
 */
export async function useSkipTicket(
  repo: RewardRepository,
  userId: string,
  taskId: string,
  now: Date,
): Promise<{ ok: boolean }> {
  return repo.useSkipTicket(userId, taskId, now);
}
