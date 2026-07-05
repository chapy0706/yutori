import { resolvePersistenceUserId } from "@/infra/auth/current-user";
import { getProgressRepository } from "@/infra/repositories";

/** unknown を Record<string,string> として検証する。 */
function asCodeMap(value: unknown): Record<string, string> | null {
  if (value === null || typeof value !== "object") return null;
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry !== "string") return null;
    out[key] = entry;
  }
  return out;
}

/**
 * 作業中コードの保存 (task_progress.working_code)。
 * 自動保存・離脱時保存 (sendBeacon) の受け口。到達状態は変えず、現在地だけ更新する。
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
  const { taskId, workingCode } = body as Record<string, unknown>;

  const code = asCodeMap(workingCode);
  if (typeof taskId !== "string" || code === null) {
    return Response.json({ error: "validation failed" }, { status: 400 });
  }

  const resolved = await resolvePersistenceUserId();
  if (!resolved.ok) {
    // 未ログインでも離脱時保存は静かに無視する (致命的でない)。
    return new Response(null, { status: 204 });
  }

  try {
    await getProgressRepository().saveWorkingCode(
      resolved.userId,
      taskId,
      code,
    );
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "failed to save" }, { status: 500 });
  }
}
