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

console.log("Creating professional_cards table...");

await sql`
  CREATE TABLE IF NOT EXISTS professional_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    tipo            card_type NOT NULL,
    titulo          VARCHAR(80) NOT NULL DEFAULT '',
    subtitulo       VARCHAR(120),
    valor           TEXT,
    ordem           INTEGER NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT true,
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW()
  )
`;
console.log("✅ professional_cards created");

await sql`
  CREATE INDEX IF NOT EXISTS cards_professional_idx
  ON professional_cards (professional_id, ordem)
`;
console.log("✅ cards_professional_idx index created");

// Verify
const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='professional_cards'
  ORDER BY ordinal_position
`;
console.log("Columns:", cols.map(r => r.column_name).join(", "));
console.log("\n🎉 Done!");
