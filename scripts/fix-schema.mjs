/**
 * fix-schema.mjs — aplica todas as mudanças de schema sem precisar de TTY
 * Compara o schema atual (schema.ts) com o DB e aplica as alterações necessárias.
 *
 * Uso: node scripts/fix-schema.mjs
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Lê DATABASE_URL do .env.local
const envPath = join(root, ".env.local");
const envContent = readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m);
if (!match) throw new Error("DATABASE_URL não encontrado em .env.local");

const DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, "");
console.log(`\n📦 Conectando a: ${DATABASE_URL.substring(0, 55)}...\n`);

const sql = neon(DATABASE_URL);

// ─── Helper: verificar se coluna existe ──────────────────────────────────────

async function columnExists(table, column) {
  const rows = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = ${table}
      AND column_name  = ${column}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function enumExists(enumName) {
  const rows = await sql`
    SELECT 1 FROM pg_type
    WHERE typname = ${enumName}
      AND typtype = 'e'
    LIMIT 1
  `;
  return rows.length > 0;
}

async function tableExists(table) {
  const rows = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = ${table}
    LIMIT 1
  `;
  return rows.length > 0;
}

// ─── Operações ───────────────────────────────────────────────────────────────

async function addColumn(table, column, definition, label) {
  const exists = await columnExists(table, column);
  if (exists) {
    console.log(`  ✓ ${label ?? column} já existe`);
    return;
  }
  await sql.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  ✅ ${label ?? column} criada`);
}

async function dropColumn(table, column) {
  const exists = await columnExists(table, column);
  if (!exists) {
    console.log(`  ✓ ${column} já removida`);
    return;
  }
  await sql.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  console.log(`  🗑  ${column} removida`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Enums ─────────────────────────────────────────────────────────────

  console.log("─── Enums ───────────────────────────────────────────────────");

  if (!(await enumExists("modalidade_atendimento"))) {
    await sql`CREATE TYPE modalidade_atendimento AS ENUM ('presencial', 'online', 'ambos')`;
    console.log("  ✅ modalidade_atendimento criado");
  } else {
    console.log("  ✓ modalidade_atendimento já existe");
  }

  // Garante que card_type existe (criado antes, mas verificar)
  if (!(await enumExists("card_type"))) {
    await sql`CREATE TYPE card_type AS ENUM (
      'certificacao','qualificacao','servico_extra',
      'whatsapp','instagram','localizacao','telefone','email'
    )`;
    console.log("  ✅ card_type criado");
  } else {
    console.log("  ✓ card_type já existe");
  }

  // ── 2. professionals ─────────────────────────────────────────────────────

  console.log("\n─── professionals ───────────────────────────────────────────");

  // Remove stale Stripe columns
  await dropColumn("professionals", "stripe_account_id");
  await dropColumn("professionals", "stripe_account_ativo");

  // Add all missing columns
  await addColumn("professionals", "parent_professional_id",
    "UUID REFERENCES professionals(id) ON DELETE SET NULL");
  await addColumn("professionals", "uf",
    "VARCHAR(2)");
  await addColumn("professionals", "headline",
    "VARCHAR(160)");
  await addColumn("professionals", "headline_destaque",
    "VARCHAR(60)");
  await addColumn("professionals", "cor_primaria",
    "VARCHAR(20) DEFAULT 'teal'");
  await addColumn("professionals", "cor_destaque",
    "VARCHAR(20)");
  await addColumn("professionals", "cor_marca",
    "VARCHAR(7) NOT NULL DEFAULT '#0d9488'");
  await addColumn("professionals", "cor_texto",
    "VARCHAR(7) NOT NULL DEFAULT '#0f172a'");
  await addColumn("professionals", "hero_titulo",
    "VARCHAR(255)");
  await addColumn("professionals", "hero_subtitulo",
    "TEXT");
  await addColumn("professionals", "hero_image_url",
    "TEXT");
  await addColumn("professionals", "telemedicina_ativo",
    "BOOLEAN NOT NULL DEFAULT false");
  await addColumn("professionals", "meet_link",
    "TEXT");
  await addColumn("professionals", "modalidade",
    "modalidade_atendimento NOT NULL DEFAULT 'presencial'");
  await addColumn("professionals", "mp_user_id",
    "VARCHAR(255)");
  await addColumn("professionals", "mp_access_token",
    "TEXT");
  await addColumn("professionals", "mp_account_ativo",
    "BOOLEAN NOT NULL DEFAULT false");

  // ── 3. services ──────────────────────────────────────────────────────────

  console.log("\n─── services ────────────────────────────────────────────────");

  await addColumn("services", "modalidade",
    "modalidade_atendimento NOT NULL DEFAULT 'presencial'");

  // ── 4. appointments ──────────────────────────────────────────────────────

  console.log("\n─── appointments ────────────────────────────────────────────");

  await addColumn("appointments", "modalidade",
    "modalidade_atendimento NOT NULL DEFAULT 'presencial'");
  await addColumn("appointments", "meet_link",
    "TEXT");
  await addColumn("appointments", "mp_preference_id",
    "VARCHAR(255)");
  await addColumn("appointments", "mp_payment_id",
    "VARCHAR(255)");
  await addColumn("appointments", "valor_pago",
    "DECIMAL(10,2)");
  await addColumn("appointments", "observacoes",
    "TEXT");
  await addColumn("appointments", "lembrete_enviado_em",
    "TIMESTAMP");
  await addColumn("appointments", "atualizado_em",
    "TIMESTAMP NOT NULL DEFAULT NOW()");

  // ── 5. subscriptions ─────────────────────────────────────────────────────

  console.log("\n─── subscriptions ───────────────────────────────────────────");

  // Remove stale Stripe columns if any
  await dropColumn("subscriptions", "stripe_customer_id");
  await dropColumn("subscriptions", "stripe_subscription_id");
  await dropColumn("subscriptions", "stripe_plan_id");

  await addColumn("subscriptions", "mp_customer_id",
    "VARCHAR(255)");
  await addColumn("subscriptions", "mp_subscription_id",
    "VARCHAR(255)");
  await addColumn("subscriptions", "mp_plan_id",
    "VARCHAR(255)");
  await addColumn("subscriptions", "trial_fim_em",
    "TIMESTAMP");
  await addColumn("subscriptions", "periodo_inicio_em",
    "TIMESTAMP");
  await addColumn("subscriptions", "periodo_fim_em",
    "TIMESTAMP");
  await addColumn("subscriptions", "atualizado_em",
    "TIMESTAMP NOT NULL DEFAULT NOW()");

  // ── 6. payments ──────────────────────────────────────────────────────────

  console.log("\n─── payments ────────────────────────────────────────────────");

  // Check if payments table has old Stripe columns
  await dropColumn("payments", "stripe_payment_intent_id");
  await dropColumn("payments", "stripe_transfer_id");
  await dropColumn("payments", "stripe_application_fee_amount");

  await addColumn("payments", "mp_payment_id",
    "VARCHAR(255)");
  await addColumn("payments", "mp_transfer_id",
    "VARCHAR(255)");
  await addColumn("payments", "taxa_plataforma",
    "DECIMAL(10,2) NOT NULL DEFAULT 0");
  await addColumn("payments", "valor_liquido",
    "DECIMAL(10,2) NOT NULL DEFAULT 0");

  // ── 7. professional_cards ────────────────────────────────────────────────

  console.log("\n─── professional_cards ──────────────────────────────────────");

  const cardsOk = await tableExists("professional_cards");
  if (!cardsOk) {
    console.log("  ⚠️  professional_cards não existe — deve ter sido criada anteriormente");
  } else {
    await addColumn("professional_cards", "titulo",
      "VARCHAR(80) NOT NULL DEFAULT ''");
    await addColumn("professional_cards", "subtitulo",
      "VARCHAR(120)");
    await addColumn("professional_cards", "valor",
      "TEXT");
    await addColumn("professional_cards", "ordem",
      "INTEGER NOT NULL DEFAULT 0");
    await addColumn("professional_cards", "ativo",
      "BOOLEAN NOT NULL DEFAULT true");
    await addColumn("professional_cards", "criado_em",
      "TIMESTAMP NOT NULL DEFAULT NOW()");
    await addColumn("professional_cards", "atualizado_em",
      "TIMESTAMP NOT NULL DEFAULT NOW()");
  }

  // ── 8. Verificação final ─────────────────────────────────────────────────

  console.log("\n─── Verificação final ───────────────────────────────────────");

  const criticalCols = [
    ["professionals", "mp_access_token"],
    ["professionals", "mp_account_ativo"],
    ["professionals", "modalidade"],
    ["professionals", "cor_marca"],
    ["appointments", "mp_preference_id"],
    ["payments", "mp_payment_id"],
  ];

  let ok = true;
  for (const [table, col] of criticalCols) {
    const exists = await columnExists(table, col);
    if (exists) {
      console.log(`  ✅ ${table}.${col}`);
    } else {
      console.log(`  ❌ ${table}.${col} AINDA FALTA`);
      ok = false;
    }
  }

  if (ok) {
    console.log("\n🎉 Schema sincronizado com sucesso! App pronto para uso.\n");
  } else {
    console.log("\n⚠️  Algumas colunas ainda faltam. Verifique os erros acima.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n💥 Erro fatal:", err.message);
  process.exit(1);
});
