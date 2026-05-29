import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envContent = readFileSync(join(root, ".env.local"), "utf8");
const url = envContent.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m)[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const inicioMes = new Date();
inicioMes.setDate(1);
inicioMes.setHours(0, 0, 0, 0);

const [totalMedicos] = await sql`SELECT COUNT(*)::int AS c FROM professionals`;
const [novosNoMes] = await sql`SELECT COUNT(*)::int AS c FROM professionals WHERE criado_em >= ${inicioMes.toISOString()}`;
const porPlano = await sql`SELECT plano, COUNT(*)::int AS c FROM professionals WHERE ativo = true GROUP BY plano`;
const subStatus = await sql`SELECT status, COUNT(*)::int AS c FROM subscriptions GROUP BY status`;
const [churn] = await sql`SELECT COUNT(*)::int AS c FROM subscriptions WHERE status='cancelada' AND atualizado_em >= ${inicioMes.toISOString()}`;
const [pag] = await sql`SELECT COUNT(*)::int AS c, COALESCE(SUM(valor_bruto),0)::float AS total FROM payments WHERE status='pago'`;
const [tickets] = await sql`SELECT COUNT(*)::int AS c FROM support_tickets WHERE status IN ('aberto','em_andamento')`;
const subAtivas = await sql`SELECT plano, COUNT(*)::int AS c FROM subscriptions WHERE status='ativa' GROUP BY plano`;
const prices = await sql`SELECT plano, valor_mensal::float AS v FROM plan_prices`;
const [pacientes] = await sql`SELECT COUNT(*)::int AS c FROM patients`;
const [agendamentos] = await sql`SELECT COUNT(*)::int AS c FROM appointments`;

const priceMap = {};
for (const p of prices) priceMap[p.plano] = p.v;
let mrr = 0;
for (const r of subAtivas) mrr += r.c * (priceMap[r.plano] ?? 0);

console.log("✅ Todas as queries de métricas executaram sem erro.\n");
console.log("── Resultado atual em produção ──");
console.log("Total de médicos:        ", totalMedicos.c);
console.log("Novos no mês:            ", novosNoMes.c);
console.log("Por plano:               ", porPlano.map(r => `${r.plano}=${r.c}`).join(", ") || "(nenhum)");
console.log("Assinaturas por status:  ", subStatus.map(r => `${r.status}=${r.c}`).join(", ") || "(nenhuma)");
console.log("Churn no mês:            ", churn.c);
console.log("Preços dos planos:       ", prices.map(r => `${r.plano}=R$${r.v}`).join(", "));
console.log("MRR:                      R$", mrr.toFixed(2));
console.log("Receita anual est.:       R$", (mrr * 12).toFixed(2));
console.log("Pacientes:               ", pacientes.c);
console.log("Agendamentos:            ", agendamentos.c);
console.log("Pagamentos pagos:        ", pag.c, "| Volume: R$", pag.total.toFixed(2));
console.log("Tickets abertos:         ", tickets.c);
