import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { countDistinct, eq } from "drizzle-orm";
import { db } from "../db";
import {
  professionals,
  payments,
  subscriptions,
  services,
  availabilityRules,
  professionalCards,
  appointments,
} from "../db/schema";

// ─── Guard (mesmo padrão do admin: hoje só exige login) ───────────────────────

async function requireAdminAccess(): Promise<string> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");
  return auth.userId;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type MonthPoint = { mes: string; valor: number };

export type AnalyticsData = {
  crescimento: MonthPoint[]; // novos médicos por mês
  crescimentoAcum: MonthPoint[]; // total acumulado de médicos
  receita: MonthPoint[]; // R$ recebido por mês (pagamentos pagos)
  cancelamentos: MonthPoint[]; // assinaturas canceladas por mês
  conversao: {
    trial: number;
    ativo: number;
    cancelado: number;
    taxaConversao: number; // ativo / (ativo + trial) em %
  };
  especialidades: { nome: string; total: number }[];
  usoFuncoes: { funcao: string; total: number; pct: number }[];
};

// ─── Helpers de bucket mensal ─────────────────────────────────────────────────

function lastMonths(n: number): { key: string; label: string; start: Date; end: Date }[] {
  const out: { key: string; label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const label = start.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    out.push({ key, label, start, end });
  }
  return out;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── fetchAnalytics ───────────────────────────────────────────────────────────

export const fetchAnalytics = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnalyticsData> => {
    await requireAdminAccess();

    const months = lastMonths(6);

    // ── Carrega dados mínimos ────────────────────────────────────────────────
    const [profRows, payRows, subRows] = await Promise.all([
      db.query.professionals.findMany({
        columns: { criadoEm: true, especialidade: true },
      }),
      db.query.payments.findMany({
        columns: { criadoEm: true, valorBruto: true, status: true },
      }),
      db.query.subscriptions.findMany({
        columns: { status: true, atualizadoEm: true },
      }),
    ]);

    // ── Crescimento de usuários (novos por mês + acumulado) ──────────────────
    const novosPorMes = new Map<string, number>();
    for (const p of profRows) {
      const k = monthKey(p.criadoEm);
      novosPorMes.set(k, (novosPorMes.get(k) ?? 0) + 1);
    }
    const crescimento: MonthPoint[] = months.map((m) => ({
      mes: m.label,
      valor: novosPorMes.get(m.key) ?? 0,
    }));
    // Acumulado: total de médicos criados até o fim de cada mês
    const crescimentoAcum: MonthPoint[] = months.map((m) => ({
      mes: m.label,
      valor: profRows.filter((p) => p.criadoEm < m.end).length,
    }));

    // ── Receita por mês (pagamentos pagos) ───────────────────────────────────
    const receitaPorMes = new Map<string, number>();
    for (const p of payRows) {
      if (p.status !== "pago") continue;
      const k = monthKey(p.criadoEm);
      receitaPorMes.set(k, (receitaPorMes.get(k) ?? 0) + Number(p.valorBruto));
    }
    const receita: MonthPoint[] = months.map((m) => ({
      mes: m.label,
      valor: Math.round((receitaPorMes.get(m.key) ?? 0) * 100) / 100,
    }));

    // ── Cancelamentos por mês ────────────────────────────────────────────────
    const cancPorMes = new Map<string, number>();
    for (const s of subRows) {
      if (s.status !== "cancelada") continue;
      const k = monthKey(s.atualizadoEm);
      cancPorMes.set(k, (cancPorMes.get(k) ?? 0) + 1);
    }
    const cancelamentos: MonthPoint[] = months.map((m) => ({
      mes: m.label,
      valor: cancPorMes.get(m.key) ?? 0,
    }));

    // ── Conversão trial → pago ───────────────────────────────────────────────
    let trial = 0;
    let ativo = 0;
    let cancelado = 0;
    for (const s of subRows) {
      if (s.status === "trial") trial++;
      else if (s.status === "ativa") ativo++;
      else if (s.status === "cancelada") cancelado++;
    }
    const baseConv = ativo + trial;
    const taxaConversao = baseConv > 0 ? Math.round((ativo / baseConv) * 100) : 0;

    // ── Especialidades mais comuns ───────────────────────────────────────────
    const espMap = new Map<string, number>();
    for (const p of profRows) {
      const nome = (p.especialidade || "Não informado").trim();
      espMap.set(nome, (espMap.get(nome) ?? 0) + 1);
    }
    const especialidades = [...espMap.entries()]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // ── Uso das funções do app (proxy a partir de dados reais) ───────────────
    const totalMedicos = profRows.length || 1;
    const [
      [comServicos],
      [comDisponibilidade],
      [comCards],
      [comMP],
      [comAgendamentos],
      [comTelemedicina],
    ] = await Promise.all([
      db.select({ c: countDistinct(services.professionalId) }).from(services),
      db.select({ c: countDistinct(availabilityRules.professionalId) }).from(availabilityRules),
      db.select({ c: countDistinct(professionalCards.professionalId) }).from(professionalCards),
      db
        .select({ c: countDistinct(professionals.id) })
        .from(professionals)
        .where(eq(professionals.mpAccountAtivo, true)),
      db.select({ c: countDistinct(appointments.professionalId) }).from(appointments),
      db
        .select({ c: countDistinct(professionals.id) })
        .from(professionals)
        .where(eq(professionals.telemedicinaAtivo, true)),
    ]);

    const usoRaw: { funcao: string; total: number }[] = [
      { funcao: "Serviços cadastrados", total: Number(comServicos.c) },
      { funcao: "Disponibilidade configurada", total: Number(comDisponibilidade.c) },
      { funcao: "Página pública (cards)", total: Number(comCards.c) },
      { funcao: "Mercado Pago conectado", total: Number(comMP.c) },
      { funcao: "Recebeu agendamentos", total: Number(comAgendamentos.c) },
      { funcao: "Telemedicina ativa", total: Number(comTelemedicina.c) },
    ];
    const usoFuncoes = usoRaw
      .map((u) => ({ ...u, pct: Math.round((u.total / totalMedicos) * 100) }))
      .sort((a, b) => b.total - a.total);

    return {
      crescimento,
      crescimentoAcum,
      receita,
      cancelamentos,
      conversao: { trial, ativo, cancelado, taxaConversao },
      especialidades,
      usoFuncoes,
    };
  },
);
