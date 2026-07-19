import { useSkipTicket } from "@/core/reward/skip-service";
import { resolvePersistenceUserId } from "@/infra/auth/current-user";
import { getRewardRepository } from "@/infra/repositories";

/**
 * スキップ券を 1 枚使い、対象課題をクリア扱いにする。
 * 券が無ければ 409 (作れない状態は静かに拒否)。境界で taskId を検証する。
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const { taskId } = body as Record<string, unknown>;
  if (typeof taskId !== "string" || taskId.length === 0) {
    return Response.json({ error: "validation failed" }, { status: 400 });
  }

  const resolved = await resolvePersistenceUserId();
  if (!resolved.ok) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  try {
    const result = await useSkipTicket(
      getRewardRepository(),
      resolved.userId,
      taskId,
      new Date(),
    );
    if (!result.ok) {
      return Response.json(
        { error: "no skip ticket available" },
        { status: 409 },
      );
    }
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "failed to use skip" }, { status: 500 });
  }
}
