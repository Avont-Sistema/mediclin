import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getAuth } from "@clerk/tanstack-start/server";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { supportConfig, supportTickets, supportMessages, users, professionals } from "../db/schema";
import { isAdminClerkId, requireAdmin } from "./admin-auth";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireProfessionalId(): Promise<string> {
  const auth = await getAuth(getWebRequest());
  if (!auth.userId) throw new Error("Não autenticado");
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, auth.userId),
    with: { professional: true },
  });
  const profId = user?.professional?.id;
  if (!profId) throw new Error("Profissional não encontrado");
  return profId;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupportConfigData = {
  id: string | null;
  email: string | null;
  whatsapp: string | null;
  whatsappMessage: string | null;
};

export type TicketStatus = "aberto" | "em_andamento" | "resolvido" | "fechado";
export type TicketPrioridade = "baixa" | "normal" | "alta" | "urgente";

export type SupportTicket = {
  id: string;
  titulo: string;
  status: TicketStatus;
  prioridade: TicketPrioridade;
  categoria: string | null;
  lidoAdmin: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  messagesCount: number;
  lastMessage: string | null;
  professional?: { id: string; nomeCompleto: string; slug: string; email: string | null };
};

export type TicketMessage = {
  id: string;
  autorRole: "professional" | "admin";
  conteudo: string;
  criadoEm: Date;
};

// ─── fetchSupportConfig (público — usado em suporte.tsx e settings) ───────────

export const fetchSupportConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<SupportConfigData> => {
    const cfg = await db.query.supportConfig.findFirst();
    return {
      id: cfg?.id ?? null,
      email: cfg?.email ?? null,
      whatsapp: cfg?.whatsapp ?? null,
      whatsappMessage: cfg?.whatsappMessage ?? null,
    };
  },
);

// ─── updateSupportConfig (admin only) ────────────────────────────────────────

export const updateSupportConfig = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email().optional().or(z.literal("")),
      whatsapp: z.string().max(30).optional().or(z.literal("")),
      whatsappMessage: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const existing = await db.query.supportConfig.findFirst();
    const payload = {
      email: data.email || null,
      whatsapp: data.whatsapp || null,
      whatsappMessage: data.whatsappMessage || "Olá, preciso de ajuda com o CuidandoVC",
      atualizadoEm: new Date(),
    };

    if (existing) {
      await db.update(supportConfig).set(payload).where(eq(supportConfig.id, existing.id));
    } else {
      await db.insert(supportConfig).values(payload);
    }

    return { ok: true };
  });

// ─── createTicket (profissional) ─────────────────────────────────────────────

export const createTicket = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      titulo: z.string().min(3).max(255),
      categoria: z.enum(["financeiro", "tecnico", "conta", "outro"]),
      prioridade: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
      mensagem: z.string().min(10).max(5000),
    }),
  )
  .handler(async ({ data }) => {
    const profId = await requireProfessionalId();

    const [ticket] = await db
      .insert(supportTickets)
      .values({
        professionalId: profId,
        titulo: data.titulo,
        categoria: data.categoria,
        prioridade: data.prioridade,
        status: "aberto",
        lidoAdmin: false,
      })
      .returning();

    await db.insert(supportMessages).values({
      ticketId: ticket.id,
      autorRole: "professional",
      conteudo: data.mensagem,
    });

    return { ticketId: ticket.id };
  });

// ─── fetchMyTickets (profissional) ───────────────────────────────────────────

export const fetchMyTickets = createServerFn({ method: "GET" }).handler(
  async (): Promise<SupportTicket[]> => {
    const profId = await requireProfessionalId();

    const tickets = await db.query.supportTickets.findMany({
      where: eq(supportTickets.professionalId, profId),
      with: { messages: { orderBy: [desc(supportMessages.criadoEm)], limit: 1 } },
      orderBy: [desc(supportTickets.atualizadoEm)],
    });

    return tickets.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      status: t.status as TicketStatus,
      prioridade: t.prioridade as TicketPrioridade,
      categoria: t.categoria,
      lidoAdmin: t.lidoAdmin,
      criadoEm: t.criadoEm,
      atualizadoEm: t.atualizadoEm,
      messagesCount: t.messages.length,
      lastMessage: t.messages[0]?.conteudo ?? null,
    }));
  },
);

// ─── fetchTicketMessages ──────────────────────────────────────────────────────

export const fetchTicketMessages = createServerFn({ method: "GET" })
  .inputValidator(z.object({ ticketId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TicketMessage[]> => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) throw new Error("Não autenticado");

    // Verifica acesso — ou é admin ou é dono do ticket
    const ticket = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, data.ticketId),
      with: { professional: { with: { user: true } } },
    });
    if (!ticket) throw new Error("Ticket não encontrado");

    const isAdmin = isAdminClerkId(auth.userId);
    const isOwner = ticket.professional.user?.clerkId === auth.userId;
    if (!isAdmin && !isOwner) throw new Error("Acesso negado");

    // Marca como lido pelo admin se for o admin acessando
    if (isAdmin && !ticket.lidoAdmin) {
      await db
        .update(supportTickets)
        .set({ lidoAdmin: true })
        .where(eq(supportTickets.id, data.ticketId));
    }

    const msgs = await db.query.supportMessages.findMany({
      where: eq(supportMessages.ticketId, data.ticketId),
      orderBy: [desc(supportMessages.criadoEm)],
    });

    return msgs.reverse().map((m) => ({
      id: m.id,
      autorRole: m.autorRole as "professional" | "admin",
      conteudo: m.conteudo,
      criadoEm: m.criadoEm,
    }));
  });

// ─── sendMessage ──────────────────────────────────────────────────────────────

export const sendTicketMessage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ticketId: z.string().uuid(), conteudo: z.string().min(1).max(5000) }))
  .handler(async ({ data }) => {
    const auth = await getAuth(getWebRequest());
    if (!auth.userId) throw new Error("Não autenticado");

    const ticket = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, data.ticketId),
      with: { professional: { with: { user: true } } },
    });
    if (!ticket) throw new Error("Ticket não encontrado");

    const isAdmin = isAdminClerkId(auth.userId);
    const isOwner = ticket.professional.user?.clerkId === auth.userId;
    if (!isAdmin && !isOwner) throw new Error("Acesso negado");

    const autorRole = isAdmin ? "admin" : "professional";

    await db.insert(supportMessages).values({
      ticketId: data.ticketId,
      autorRole,
      conteudo: data.conteudo,
    });

    // Quando admin responde, marca como "em_andamento" e reseta lido_admin
    if (isAdmin && ticket.status === "aberto") {
      await db
        .update(supportTickets)
        .set({ status: "em_andamento", atualizadoEm: new Date(), lidoAdmin: true })
        .where(eq(supportTickets.id, data.ticketId));
    } else {
      // Quando profissional manda mensagem, marca como não lido pelo admin
      await db
        .update(supportTickets)
        .set({ atualizadoEm: new Date(), lidoAdmin: false })
        .where(eq(supportTickets.id, data.ticketId));
    }

    return { ok: true };
  });

// ─── updateTicketStatus (admin) ───────────────────────────────────────────────

export const updateTicketStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticketId: z.string().uuid(),
      status: z.enum(["aberto", "em_andamento", "resolvido", "fechado"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await db
      .update(supportTickets)
      .set({ status: data.status, atualizadoEm: new Date() })
      .where(eq(supportTickets.id, data.ticketId));
    return { ok: true };
  });

// ─── fetchAllTickets (admin) ──────────────────────────────────────────────────

export const fetchAllTickets = createServerFn({ method: "GET" }).handler(
  async (): Promise<SupportTicket[]> => {
    await requireAdmin();

    const tickets = await db.query.supportTickets.findMany({
      with: {
        messages: { orderBy: [desc(supportMessages.criadoEm)], limit: 1 },
        professional: { with: { user: true } },
      },
      orderBy: [desc(supportTickets.atualizadoEm)],
    });

    return tickets.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      status: t.status as TicketStatus,
      prioridade: t.prioridade as TicketPrioridade,
      categoria: t.categoria,
      lidoAdmin: t.lidoAdmin,
      criadoEm: t.criadoEm,
      atualizadoEm: t.atualizadoEm,
      messagesCount: t.messages.length,
      lastMessage: t.messages[0]?.conteudo ?? null,
      professional: {
        id: t.professional.id,
        nomeCompleto: t.professional.nomeCompleto,
        slug: t.professional.slug,
        email: t.professional.user?.email ?? null,
      },
    }));
  },
);
