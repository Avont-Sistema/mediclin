import { type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useClerk } from "@clerk/tanstack-start";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  CalendarDays,
  UserRound,
  Settings,
  LogOut,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { fetchCurrentProfessional } from "../lib/auth";

// ─── Nav config ───────────────────────────────────────────────────────────────

type NavItem =
  | { kind: "link"; icon: typeof LayoutDashboard; label: string; href: string }
  | { kind: "stub"; icon: typeof LayoutDashboard; label: string; badge: string };

const NAV_ITEMS: NavItem[] = [
  { kind: "link", icon: LayoutDashboard, label: "Visão geral", href: "/dashboard" },
  { kind: "link", icon: CalendarDays, label: "Agenda", href: "/agenda" },
  { kind: "link", icon: UserRound, label: "Pacientes", href: "/patients" },
  { kind: "stub", icon: Wallet, label: "Financeiro", badge: "Em breve" },
  { kind: "link", icon: Settings, label: "Configurações", href: "/settings" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: professional } = useQuery({
    queryKey: ["currentProfessional"],
    queryFn: () => fetchCurrentProfessional(),
    staleTime: 60_000,
  });

  const profNome = professional?.nomeCompleto ?? "";
  const profEspecialidade = professional?.especialidade ?? "";
  const profRegistro = professional?.registro ?? "";
  const initials = profNome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="flex">
        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white min-h-screen sticky top-0">
          <div className="px-6 py-5 border-b border-slate-100">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 grid place-items-center text-white">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight">MediClin</div>
                <div className="text-[11px] text-slate-500">Painel do médico</div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
            {NAV_ITEMS.map((item) => {
              if (item.kind === "stub") {
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 cursor-not-allowed select-none"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    <span className="ml-auto text-[10px] font-medium bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  </div>
                );
              }

              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                    isActive
                      ? "bg-gradient-to-r from-teal-50 to-indigo-50 text-teal-700 font-medium ring-1 ring-teal-100"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition group">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 grid place-items-center text-white font-semibold text-sm shrink-0">
                {initials || "DR"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{profNome || "Médico"}</div>
                <div className="text-xs text-slate-500 truncate">
                  {profEspecialidade}
                  {profRegistro ? ` · ${profRegistro}` : ""}
                </div>
              </div>
              <button
                title="Sair"
                onClick={() =>
                  void signOut(() => {
                    void navigate({ to: "/" });
                  })
                }
                className="opacity-0 group-hover:opacity-100 transition"
              >
                <LogOut className="h-4 w-4 text-slate-400 hover:text-rose-500 transition" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
