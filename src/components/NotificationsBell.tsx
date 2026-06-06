import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  X,
  DollarSign,
  CalendarPlus,
  Clock,
  XCircle,
  UserX,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import {
  fetchNotifications,
  type AppNotification,
  type NotificationKind,
} from "../lib/notifications";

const LAST_SEEN_KEY = "cuidandovc:notif_last_seen";

const KIND_META: Record<
  NotificationKind,
  { label: string; icon: LucideIcon; iconBg: string; iconColor: string }
> = {
  pago: {
    label: "Novo agendamento pago",
    icon: DollarSign,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  novo: {
    label: "Novo agendamento",
    icon: CalendarPlus,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  aguardando: {
    label: "Aguardando pagamento",
    icon: Clock,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  cancelado: {
    label: "Agendamento cancelado",
    icon: XCircle,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  no_show: {
    label: "Paciente não compareceu",
    icon: UserX,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
  concluido: {
    label: "Consulta concluída",
    icon: CheckCircle2,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatApptDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${d.toLocaleTimeString(
    "pt-BR",
    { hour: "2-digit", minute: "2-digit", hour12: false },
  )}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(0);

  // Carrega o "última vez visto" do localStorage no mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LAST_SEEN_KEY);
    setLastSeen(stored ? Number(stored) : 0);
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30_000, // atualiza a cada 30s
    refetchOnWindowFocus: true,
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => new Date(n.occurredAt).getTime() > lastSeen).length,
    [notifications, lastSeen],
  );

  const handleOpen = () => {
    setOpen((v) => {
      const next = !v;
      // Ao abrir, marca tudo como lido (lastSeen = agora)
      if (next && typeof window !== "undefined") {
        const now = Date.now();
        window.localStorage.setItem(LAST_SEEN_KEY, String(now));
        setLastSeen(now);
      }
      return next;
    });
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100 transition"
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Notificações</p>
                <p className="text-xs text-slate-400">Atividade recente do consultório</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 grid place-items-center rounded-lg hover:bg-slate-100 transition text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">Tudo em dia!</p>
                <p className="text-xs text-slate-400 mt-0.5">Nenhuma atividade recente.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {notifications.map((n) => (
                  <NotificationRow key={`${n.id}-${n.kind}`} n={n} lastSeen={lastSeen} />
                ))}
              </ul>
            )}

            <div className="px-4 py-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: "/agenda" });
                }}
                className="w-full text-xs text-center text-teal-600 hover:text-teal-800 font-medium py-1 transition"
              >
                Ver agenda completa →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationRow({ n, lastSeen }: { n: AppNotification; lastSeen: number }) {
  const meta = KIND_META[n.kind];
  const Icon = meta.icon;
  const isUnread = new Date(n.occurredAt).getTime() > lastSeen;

  return (
    <li
      className={`px-4 py-3 flex items-start gap-3 transition ${isUnread ? "bg-teal-50/40" : "hover:bg-slate-50"}`}
    >
      <div className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${meta.iconBg}`}>
        <Icon className={`h-4 w-4 ${meta.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 truncate">{meta.label}</p>
          <span className="text-[10px] text-slate-400 shrink-0">{relativeTime(n.occurredAt)}</span>
        </div>
        <p className="text-xs text-slate-600 truncate">
          {n.patientName} · {n.serviceName}
        </p>
        <p className="text-xs text-slate-400">
          {formatApptDate(n.appointmentStart)}
          {n.valor != null && (
            <>
              {" · "}
              <span className="font-semibold text-slate-600">{brl(n.valor)}</span>
            </>
          )}
        </p>
      </div>
      {isUnread && <span className="mt-1 h-2 w-2 rounded-full bg-teal-500 shrink-0" />}
    </li>
  );
}
