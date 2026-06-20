import type { AuthGateway, AuthenticatedUser } from "@/core/ports/auth-gateway";

import { auth } from "./next-auth";

/**
 * AuthGateway の Auth.js + Keycloak 実装。
 * Server Components・Route Handlers・Server Actions から呼び出す。
 * core 層が AuthGateway インターフェース越しにこれを利用することで、
 * Auth.js や Keycloak への直接依存を infra 層に封じ込める。
 */
export class KeycloakAuthGateway implements AuthGateway {
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const session = await auth();
    if (!session?.user?.id) return null;
    return { id: session.user.id };
  }
}
