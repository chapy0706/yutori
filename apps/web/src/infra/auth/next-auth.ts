import NextAuth, { type DefaultSession } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

import { getDb } from "@/infra/db/client";
import { users } from "@/infra/db/schema";

/**
 * next-auth の Session 型を拡張し、user.id（Keycloak sub）を追加する。
 * 型拡張はここに集約し、アプリ全体で session.user.id を型安全に参照できるようにする。
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? "",
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? "",
      issuer: process.env.KEYCLOAK_ISSUER ?? "",
    }),
  ],
  /**
   * JWT セッション戦略を使用する。
   * セッションを DB に保存しないため、Drizzle Adapter は不要。
   * ユーザー情報は Keycloak の JWT クレームから取得する。
   */
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * JWT コールバック。
     * Keycloak の sub（UUID）をトークンに含める。
     * これが session コールバックで session.user.id として公開される。
     */
    jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
    /** セッションコールバック。JWT の sub を session.user.id として公開する。 */
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    /**
     * サインインコールバック。
     * 初回ログイン時に users テーブルへ upsert する。
     * users テーブルは Keycloak の sub を持つ薄い存在で、
     * 認証情報そのものは Keycloak が管理する。
     */
    async signIn({ user, account }) {
      if (
        account?.provider === "keycloak" &&
        account.providerAccountId &&
        user.name
      ) {
        await getDb()
          .insert(users)
          .values({
            id: account.providerAccountId,
            displayName: user.name,
          })
          .onConflictDoNothing();
      }
      return true;
    },
  },
});
