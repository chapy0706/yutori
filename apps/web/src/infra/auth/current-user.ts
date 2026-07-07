import { auth } from "@/infra/auth/next-auth";
import { isDatabaseMode } from "@/infra/repositories";

const LOCAL_DEV_USER = "local-dev-user";

/** ログイン中のユーザー ID (Keycloak sub)。未ログインなら null。 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * 画面表示 (進捗・アンロック・作業中コード) に使うユーザー ID。
 *
 * DB モードは実ユーザーが要るので未ログインは null (既定表示)。fixture モードは
 * インメモリのため開発用 ID にフォールバックし、提出 API と同じ主体で一貫させる。
 */
export async function getViewerUserId(): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (userId !== null) return userId;
  return isDatabaseMode() ? null : LOCAL_DEV_USER;
}

/**
 * 永続化に使うユーザー ID を解決する。
 *
 * DB モードでは実ユーザー (users テーブルへの FK) が必須のため、未ログインは拒否する。
 * fixture モードはインメモリ永続化で FK 制約がないため、開発用の固定 ID にフォールバック。
 */
export async function resolvePersistenceUserId(): Promise<
  { ok: true; userId: string } | { ok: false }
> {
  const userId = await getCurrentUserId();
  if (userId !== null) return { ok: true, userId };
  if (isDatabaseMode()) return { ok: false };
  return { ok: true, userId: LOCAL_DEV_USER };
}
