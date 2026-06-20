import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit 設定。マイグレーションの生成と適用に使用する。
 *
 * 使用例（apps/web で実行）:
 *   pnpm drizzle-kit generate   # マイグレーションファイルを生成
 *   pnpm drizzle-kit migrate    # DB にマイグレーションを適用
 *   pnpm drizzle-kit studio     # Drizzle Studio で DB を確認
 *
 * DATABASE_URL は Oracle Cloud A1 上の PostgreSQL への接続文字列。
 * Coolify 管理の PostgreSQL は外部にポートを晒さず、
 * Docker 内部ホスト名（postgres:5432）で接続する。
 */
export default {
  schema: "./src/infra/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
