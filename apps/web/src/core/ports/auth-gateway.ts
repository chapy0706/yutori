/**
 * 認証ポート（依存性逆転の境界）。
 * core 層はこのインターフェース越しにのみ認証情報を参照する。
 * Auth.js や Keycloak を core から直接 import しない。
 * これにより認証基盤を変えても core は無傷に保たれる。
 */

export type AuthenticatedUser = {
  /** Keycloak の sub（UUID）。users テーブルの id と一致する。 */
  id: string;
};

export interface AuthGateway {
  /** 認証済みユーザーを返す。未認証なら null。 */
  getCurrentUser(): Promise<AuthenticatedUser | null>;
}
