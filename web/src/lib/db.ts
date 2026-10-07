import { Pool } from "pg";

const globalForDb = globalThis as unknown as { coldproofPool?: Pool };

export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return (globalForDb.coldproofPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 12,
    connectionTimeoutMillis: 3000,
  }));
}
