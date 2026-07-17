import { ProfileUpdateSchema } from "@yutori/contracts";

import { resolvePersistenceUserId } from "@/infra/auth/current-user";
import { getProfileRepository } from "@/infra/repositories";

/**
 * 学習設定の更新。いまは並走者・ランキング表示の ON/OFF のみ (issue-10)。
 *
 * profiles は可変の設定テーブルなので更新してよい (ログ系ではない)。
 * 境界では unknown を Zod で検証してから扱う。
 */
export async function PATCH(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = ProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "validation failed" }, { status: 400 });
  }

  const resolved = await resolvePersistenceUserId();
  if (!resolved.ok) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  try {
    await getProfileRepository().setShowRanking(
      resolved.userId,
      parsed.data.showRanking,
    );
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "failed to save" }, { status: 500 });
  }
}
