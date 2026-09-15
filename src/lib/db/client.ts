import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

type DB = NeonDatabase<typeof schema>;

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Connect Neon on Vercel before running Fanoos.");
  }
  return drizzle(new Pool({ connectionString: url }), { schema });
}

const globalForDb = globalThis as unknown as { __fanoosDb?: DB };

export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = globalForDb.__fanoosDb ?? (globalForDb.__fanoosDb = createDb());
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
