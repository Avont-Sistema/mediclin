/**
 * Seed do médico "felipe1" — exemplo para testar o novo layout da página pública
 * (foto, headline, cards customizados, serviços).
 *
 * Execute: npx tsx src/db/seed-felipe.ts
 * Idempotente: pode rodar várias vezes que não duplica dados.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log("🌱 Seed do Felipe1 — página pública demo\n");

  // ── User ──────────────────────────────────────────────────────────────────
  console.log("👤 Garantindo user felipe…");
  await db
    .insert(schema.users)
    .values({
      clerkId: "user_seed_felipe",
      email: "dr.felipe@mediclin.dev",
      nome: "Felipe Cardoso",
    })
    .onConflictDoNothing();

  const user = await db.query.users.findFirst({
    where: eq(schema.users.clerkId, "user_seed_felipe"),
  });
  if (!user) throw new Error("Falha ao criar user felipe");

  // ── Professional ──────────────────────────────────────────────────────────
  // Upsert: se já existe com slug felipe1, faz UPDATE (preserva appointments e FKs).
  console.log("🩺 Garantindo profissional felipe1…");

  const existing = await db.query.professionals.findFirst({
    where: eq(schema.professionals.slug, "felipe1"),
  });

  let prof: typeof schema.professionals.$inferSelect;

  if (existing) {
    console.log("   → Já existe, fazendo UPDATE…");
    const [updated] = await db
      .update(schema.professionals)
      .set({
        nomeCompleto: "Dr. Felipe Cardoso",
        especialidade: "Cardiologia",
        registro: "CRM 456789-SP",
        headline: "Cuidado de saúde com Cardiologia.",
        headlineDestaque: "Cardiologia",
        bio: "Cardiologista intervencionista com foco em prevenção e qualidade de vida. Atendimento humanizado em São Paulo e por teleconsulta.",
        telefoneWhatsapp: "+5511999990010",
        corPrimaria: "teal",
        ativo: true,
      })
      .where(eq(schema.professionals.id, existing.id))
      .returning();
    prof = updated;

    // Limpa cards antigos para re-seed
    await db
      .delete(schema.professionalCards)
      .where(eq(schema.professionalCards.professionalId, prof.id));
  } else {
    const [created] = await db
      .insert(schema.professionals)
      .values({
        userId: user.id,
        slug: "felipe1",
        nomeCompleto: "Dr. Felipe Cardoso",
        especialidade: "Cardiologia",
        registro: "CRM 456789-SP",
        headline: "Cuidado de saúde com Cardiologia.",
        headlineDestaque: "Cardiologia",
        bio: "Cardiologista intervencionista com foco em prevenção e qualidade de vida. Atendimento humanizado em São Paulo e por teleconsulta.",
        fotoUrl: null,
        telefoneWhatsapp: "+5511999990010",
        corPrimaria: "teal",
        plano: "pro",
        ativo: true,
      })
      .returning();
    prof = created;
  }

  // ── Cards ─────────────────────────────────────────────────────────────────
  console.log("🃏 Criando cards customizados…");
  await db.insert(schema.professionalCards).values([
    {
      professionalId: prof.id,
      tipo: "qualificacao",
      titulo: "Especialização:",
      subtitulo: "Cardiologia Intervencionista",
      ordem: 0,
    },
    {
      professionalId: prof.id,
      tipo: "qualificacao",
      titulo: "Qualificação em:",
      subtitulo: "Hemodinâmica",
      ordem: 1,
    },
    {
      professionalId: prof.id,
      tipo: "whatsapp",
      titulo: "Fale comigo",
      subtitulo: "Enviar Mensagem",
      valor: "+5511999990010",
      ordem: 2,
    },
    {
      professionalId: prof.id,
      tipo: "localizacao",
      titulo: "Consultório",
      subtitulo: "Localização",
      valor: "https://maps.google.com/?q=Av+Paulista+1000+São+Paulo",
      ordem: 3,
    },
    {
      professionalId: prof.id,
      tipo: "certificacao",
      titulo: "Médico certificado",
      subtitulo: "CRM 456789-SP",
      ordem: 4,
    },
    {
      professionalId: prof.id,
      tipo: "instagram",
      titulo: "Siga no Instagram",
      subtitulo: "@drfelipecardio",
      valor: "drfelipecardio",
      ordem: 5,
    },
  ]);

  // ── Services ──────────────────────────────────────────────────────────────
  console.log("💊 Garantindo serviços… (apenas insere se não existir nenhum)");
  const existingServices = await db.query.services.findMany({
    where: eq(schema.services.professionalId, prof.id),
  });
  if (existingServices.length === 0) {
    await db.insert(schema.services).values([
    {
      professionalId: prof.id,
      nome: "Consulta Cardiológica",
      descricao: "Avaliação completa com eletrocardiograma incluído.",
      preco: "450.00",
      duracaoMinutos: 60,
    },
    {
      professionalId: prof.id,
      nome: "Ecocardiograma",
      descricao: "Ultrassonografia do coração com laudo no mesmo dia.",
      preco: "520.00",
      duracaoMinutos: 45,
    },
    {
      professionalId: prof.id,
      nome: "Teleconsulta",
      descricao: "Atendimento online por videoconferência.",
      preco: "250.00",
      duracaoMinutos: 30,
    },
    ]);
  } else {
    console.log(`   → ${existingServices.length} serviços já existem, pulando.`);
  }

  // ── Availability ──────────────────────────────────────────────────────────
  console.log("📅 Garantindo disponibilidade…");
  await db
    .insert(schema.availabilityRules)
    .values([
      { professionalId: prof.id, diaSemana: "segunda", horaInicio: "08:00", horaFim: "18:00" },
      { professionalId: prof.id, diaSemana: "terca", horaInicio: "08:00", horaFim: "18:00" },
      { professionalId: prof.id, diaSemana: "quarta", horaInicio: "08:00", horaFim: "18:00" },
      { professionalId: prof.id, diaSemana: "quinta", horaInicio: "08:00", horaFim: "18:00" },
      { professionalId: prof.id, diaSemana: "sexta", horaInicio: "08:00", horaFim: "17:00" },
    ])
    .onConflictDoNothing();

  console.log("\n✅ Seed do Felipe1 concluído!");
  console.log(`   → Slug: felipe1`);
  console.log(`   → ID:   ${prof.id}`);
  console.log(`   → URL:  /felipe1\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
