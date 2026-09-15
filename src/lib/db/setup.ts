import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { ensureColumns } from "./migrate";
import { SCHEMA_SQL } from "./sql";
import { seedIfEmpty } from "./seed";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing. Pull Vercel env first.");

  const sql = neon(url);
  const statements = SCHEMA_SQL.split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }
  await ensureColumns();

  await seedIfEmpty();
  console.log("Fanoos tables and demo shops are ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
