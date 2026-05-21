import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { MapPin, Clock, ChevronRight, Stethoscope } from "lucide-react";
import { fetchProfessionalBySlug } from "../lib/availability";
import { BookingWizard } from "../components/BookingWizard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import type { InferSelectModel } from "drizzle-orm";
import type { services } from "../db/schema";

type Service = InferSelectModel<typeof services>;

export const Route = createFileRoute("/$slug")({
  head: () => ({
    meta: [{ title: "MediClin — Agendar consulta" }],
  }),
  loader: async ({ params }) => {
    const prof = await fetchProfessionalBySlug({ data: { slug: params.slug } });
    if (!prof) throw notFound();
    return prof;
  },
  notFoundComponent: ProfessionalNotFound,
  component: ProfessionalPage,
});

function formatCurrency(v: string | number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProfessionalPage() {
  const professional = Route.useLoaderData()!;
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4 gap-2.5">
          <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600">
            <div className="size-2.5 rounded-sm rotate-45 bg-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-800">MediClin</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-20 pt-8">
        {/* Profile card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
          <div className="h-24 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div className="px-6 pb-6">
            <div className="-mt-12 mb-4">
              {professional.fotoUrl ? (
                <img
                  src={professional.fotoUrl}
                  alt={professional.nomeCompleto}
                  width={80}
                  height={80}
                  className="size-20 rounded-2xl object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="size-20 rounded-2xl bg-teal-600 border-4 border-white shadow-md grid place-items-center">
                  <span className="text-xl font-bold text-white">
                    {professional.nomeCompleto
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-xl font-bold text-slate-900">{professional.nomeCompleto}</h1>
            <p className="text-sm text-teal-700 font-medium mt-0.5">{professional.especialidade}</p>

            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Stethoscope className="h-3.5 w-3.5" />
                {professional.registro}
              </span>
              {professional.telefoneWhatsapp && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  WhatsApp: {professional.telefoneWhatsapp}
                </span>
              )}
            </div>

            {professional.bio && (
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">{professional.bio}</p>
            )}
          </div>
        </div>

        {/* Services */}
        <h2 className="text-base font-semibold text-slate-900 mb-3">Serviços disponíveis</h2>

        {professional.services.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Nenhum serviço disponível no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {professional.services.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-teal-400 hover:shadow-md group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{service.nome}</p>
                    {service.descricao && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {service.descricao}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {service.duracaoMinutos} min
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(service.preco)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 group-hover:text-teal-700">
                      Agendar <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Booking sheet */}
      <Sheet open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
        <SheetContent side="bottom" className="h-[92dvh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base">Agendar consulta</SheetTitle>
          </SheetHeader>
          {selectedService && (
            <BookingWizard
              professionalId={professional.id}
              service={selectedService}
              professionalNome={professional.nomeCompleto}
              stripeEnabled={professional.stripeAccountAtivo}
              onBack={() => setSelectedService(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProfessionalNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
          <Stethoscope className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Profissional não encontrado</h1>
        <p className="mt-2 text-sm text-slate-500">
          O link que você acessou não corresponde a nenhum profissional cadastrado.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Ir para o início
        </a>
      </div>
    </div>
  );
}
