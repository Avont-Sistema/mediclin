import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const cols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'professionals'
    ORDER BY ordinal_position
  `;
  console.log("Colunas em professionals:");
  for (const c of cols) console.log(`  - ${c.column_name}`);

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log("\nTabelas:");
  for (const t of tables) console.log(`  - ${t.table_name}`);

  process.exit(0);
}

main();
