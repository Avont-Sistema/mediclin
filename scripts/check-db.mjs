import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envContent = readFileSync(join(root, ".env.local"), "utf8");
const match = envContent.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m);
const url = match[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
console.log("Tables:", tables.map(r => r.tablename).join(", "));

const cards = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='professional_cards'
  ORDER BY ordinal_position
`;
if (cards.length > 0) {
  console.log("professional_cards columns:", cards.map(r => r.column_name).join(", "));
} else {
  console.log("professional_cards: TABLE MISSING — needs creation");
}

// Check professionals columns
const profs = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='professionals'
  ORDER BY ordinal_position
`;
console.log("professionals columns:", profs.map(r => r.column_name).join(", "));
