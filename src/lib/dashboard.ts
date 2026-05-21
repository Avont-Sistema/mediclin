import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, gte, lt, lte } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { appointments, payments, users, subscriptions } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DisplayStatus =
  | "confirmado"
  | "aguardando"
  | "em-andamento"
  | "concluido"
  | "cancelado";

export type DashboardAppt = {
  id: string;
  time: string;
  patient: string;
  age: number;
  type: "Presencial" | "Teleconsulta";
  reason: string;
  status: DisplayStatus;
  avatar: string;
};

export type DashboardStats = {
  consultasHoje: number;
  pacientesAtivos: number;
  faturamentoMes: number;
  taxaNoShow: number;
};

export type WeekDay = {
  day: string;
  consultas: number;
  receita: number;
};

export type SubscriptionInfo = {
  plano: "free" | "pro" | "clinic";
  status: "ativa" | "cancelada" | "inadimplente" | "trial";
  trialFimEm: string | null;
  periodoFimEm: string | null;
  hasStripeCustomer: boolean;
};

export type DashboardData = {
  professional: {
    id: string;
    nomeCompleto: string;
    especialidade: string;
    registro: string;
    slug: string;
    stripeAccountAtivo: boolean;
  };
  subscription: SubscriptionInfo;
  stats: DashboardStats;
  todayAppointments: DashboardAppt[];
  weekData: WeekDay[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayBounds(d: Date): { start: Date; next: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);
  return { start, next };
}

function toHHMM(d: Date): string {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function initials(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

type DbStatus = (typeof appointments.$inferSelect)["status"];

function mapStatus(s: DbStatus): DisplayStatus {
  switch (s) {
    case "aguardando_pagamento":
      return "aguardando";
    case "confirmado":
      return "confirmado";
    case "concluido":
      return "concluido";
    case "cancelado":
    case "no_show":
      return "cancelado";
  }
}

// ─── Server function ──────────────────────────────────────────────────────────

export const fetchDashboardData = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardData | null> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) return null;

    const userRecord = await db.query.users.findFirst({
      where: eq(users.clerkId, auth.userId),
      with: { professional: true },
    });

    const professional = userRecord?.professional;
    if (!professional) return null;

    const profId = professional.id;
    const now = new Date();

    // ── Subscription (auto-cria trial se for o primeiro acesso) ──────────────
    let sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.professionalId, profId),
    });

    if (!sub) {
      await db
        .insert(subscriptions)
        .values({
          professionalId: profId,
          plano: "free",
          status: "trial",
          trialFimEm: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.professionalId, profId),
      });
    }

    // ── Today's appointments ─────────────────────────────────────────────────
    const { start: todayStart, next: todayNext } = dayBounds(now);

    const rawToday = await db.query.appointments.findMany({
      where: and(
        eq(appointments.professionalId, profId),
        gte(appointments.inicio, todayStart),
        lt(appointments.inicio, todayNext),
      ),
      with: { patient: true, service: true },
      orderBy: [asc(appointments.inicio)],
    });

    const todayAppointments: DashboardAppt[] = rawToday.map((a) => ({
      id: a.id,
      time: toHHMM(a.inicio),
      patient: a.patient.nome,
      age: 0,
      type: "Presencial",
      reason: a.service.nome,
      status: mapStatus(a.status),
      avatar: initials(a.patient.nome),
    }));

    // ── Month data for stats ─────────────────────────────────────────────────
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const monthAppts = await db.query.appointments.findMany({
      where: and(
        eq(appointments.professionalId, profId),
        gte(appointments.inicio, monthStart),
        lt(appointments.inicio, nextMonth),
      ),
    });

    const noShowCount = monthAppts.filter((a) => a.status === "no_show").length;
    const taxaNoShow =
      monthAppts.length > 0 ? parseFloat(((noShowCount / monthAppts.length) * 100).toFixed(1)) : 0;

    const uniquePatients = new Set(monthAppts.map((a) => a.patientId)).size;

    // ── Monthly revenue ──────────────────────────────────────────────────────
    const monthPayments = await db.query.payments.findMany({
      where: and(
        eq(payments.professionalId, profId),
        gte(payments.criadoEm, monthStart),
        lt(payments.criadoEm, nextMonth),
        lte(payments.criadoEm, new Date()), // sanity
      ),
    });

    const faturamentoMes = monthPayments
      .filter((p) => p.status === "pago")
      .reduce((sum, p) => sum + Number(p.valorLiquido), 0);

    // ── Week chart (last 7 days) ─────────────────────────────────────────────
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    const { start: ws } = dayBounds(weekStart);

    const weekAppts = await db.query.appointments.findMany({
      where: and(
        eq(appointments.professionalId, profId),
        gte(appointments.inicio, ws),
        lt(appointments.inicio, todayNext),
      ),
    });

    const weekPayments = await db.query.payments.findMany({
      where: and(
        eq(payments.professionalId, profId),
        gte(payments.criadoEm, ws),
        lt(payments.criadoEm, todayNext),
      ),
    });

    const weekData: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const { start, next } = dayBounds(d);

      const dayAppts = weekAppts.filter(
        (a) => a.inicio >= start && a.inicio < next && a.status !== "cancelado",
      );
      const dayRevenue = weekPayments
        .filter((p) => p.criadoEm >= start && p.criadoEm < next && p.status === "pago")
        .reduce((s, p) => s + Number(p.valorLiquido), 0);

      return {
        day: d.toLocaleDateString("pt-BR", { weekday: "short" }),
        consultas: dayAppts.length,
        receita: dayRevenue,
      };
    });

    return {
      professional: {
        id: professional.id,
        nomeCompleto: professional.nomeCompleto,
        especialidade: professional.especialidade,
        registro: professional.registro,
        slug: professional.slug,
        stripeAccountAtivo: professional.stripeAccountAtivo,
      },
      subscription: {
        plano: (sub?.plano ?? "free") as "free" | "pro" | "clinic",
        status: (sub?.status ?? "trial") as "ativa" | "cancelada" | "inadimplente" | "trial",
        trialFimEm: sub?.trialFimEm?.toISOString() ?? null,
        periodoFimEm: sub?.periodoFimEm?.toISOString() ?? null,
        hasStripeCustomer: !!sub?.stripeCustomerId,
      },
      stats: {
        consultasHoje: rawToday.filter((a) => a.status !== "cancelado").length,
        pacientesAtivos: uniquePatients,
        faturamentoMes,
        taxaNoShow,
      },
      todayAppointments,
      weekData,
    };
  },
);
