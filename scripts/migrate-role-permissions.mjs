import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql.query(`
  CREATE TABLE IF NOT EXISTS role_tab_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role admin_role NOT NULL,
    tab_id VARCHAR(50) NOT NULL,
    visivel BOOLEAN NOT NULL DEFAULT true,
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(role, tab_id)
  )
`);
console.log("✓ role_tab_permissions criada");
