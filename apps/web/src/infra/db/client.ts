import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * DB クライアントのシングルトン。
 * Pool は module load 時に生成せず、初回アクセス時に生成する（lazy init）。
 * これにより DATABASE_URL が未設定のビルド環境でも import エラーにならない。
 */
let _pool: Pool | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

const getPool = (): Pool => {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _pool = new Pool({ connectionString });
  }
  return _pool;
};

export const getDb = () => {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
};
