import { GradingOutputSchema } from "@yutori/contracts";

import { recordSubmission } from "@/core/learning/submission-service";
import { resolvePersistenceUserId } from "@/infra/auth/current-user";
import {
  getProgressRepository,
  getSubmissionRepository,
} from "@/infra/repositories";

/** unknown を Record<string,string> として検証する。境界の型の嘘を防ぐ。 */
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
 * 採点結果の永続化 (submissions への追記 + task_progress の更新)。
 *
 * 採点自体はクライアントの Worker が済ませており、ここではその結果を検証して保存する
 * だけ (ADR-0002 のハイブリッド方式)。core を呼ぶだけの薄い層に保つ。
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
  const { taskId, submittedCode, output } = body as Record<string, unknown>;

  const code = asCodeMap(submittedCode);
  const parsedOutput = GradingOutputSchema.safeParse(output);
  if (typeof taskId !== "string" || code === null || !parsedOutput.success) {
    return Response.json({ error: "validation failed" }, { status: 400 });
  }

  const resolved = await resolvePersistenceUserId();
  if (!resolved.ok) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  try {
    const { submissionId } = await recordSubmission(
      getSubmissionRepository(),
      getProgressRepository(),
      {
        userId: resolved.userId,
        taskId,
        submittedCode: code,
        output: parsedOutput.data,
      },
    );
    return Response.json({ submissionId }, { status: 201 });
  } catch {
    return Response.json({ error: "failed to save" }, { status: 500 });
  }
}
