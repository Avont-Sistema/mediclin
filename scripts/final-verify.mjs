/**
 * final-verify.mjs — verifica se o schema do DB bate com o que o app precisa
 */
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

// Critical columns needed by the app
const REQUIRED = {
  professionals: [
    "id","user_id","slug","nome_completo","especialidade","registro","uf",
    "headline","headline_destaque","bio","foto_url","telefone_whatsapp",
    "cor_primaria","cor_destaque","cor_marca","cor_texto",
    "hero_titulo","hero_subtitulo","hero_image_url",
    "telemedicina_ativo","meet_link","modalidade",
    "mp_user_id","mp_access_token","mp_account_ativo",
    "plano","ativo","criado_em","atualizado_em",
  ],
  appointments: [
    "id","professional_id","service_id","patient_id",
    "inicio","fim","status","modalidade","meet_link",
    "mp_preference_id","mp_payment_id","valor_pago",
    "observacoes","lembrete_enviado_em","criado_em","atualizado_em",
  ],
  payments: [
    "id","appointment_id","professional_id",
    "mp_payment_id","mp_transfer_id",
    "valor_bruto","taxa_plataforma","valor_liquido",
    "status","criado_em",
  ],
  subscriptions: [
    "id","professional_id",
    "mp_customer_id","mp_subscription_id","mp_plan_id",
    "plano","status",
    "trial_fim_em","periodo_inicio_em","periodo_fim_em",
    "criado_em","atualizado_em",
  ],
  professional_cards: [
    "id","professional_id","tipo","titulo","subtitulo","valor","ordem","ativo","criado_em","atualizado_em",
  ],
  services: [
    "id","professional_id","nome","descricao","preco","duracao_minutos","modalidade","ativo","criado_em","atualizado_em",
  ],
  patients: [
    "id","email","nome","telefone","cpf","criado_em",
  ],
  users: [
    "id","clerk_id","email","nome","criado_em","atualizado_em",
  ],
};

let allOk = true;

for (const [table, required] of Object.entries(REQUIRED)) {
  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name=${table}
  `;
  const existing = new Set(rows.map(r => r.column_name));
  const missing = required.filter(c => !existing.has(c));

  if (missing.length === 0) {
    console.log(`  ✅ ${table} (${required.length} cols)`);
  } else {
    console.log(`  ❌ ${table} — MISSING: ${missing.join(", ")}`);
    allOk = false;
  }
}

if (allOk) {
  console.log("\n🎉 Schema 100% sincronizado — app pronto!");
} else {
  console.log("\n⚠️  Colunas faltando detectadas!");
  process.exit(1);
}
