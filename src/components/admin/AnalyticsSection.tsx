import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  UserX,
  Target,
  Stethoscope,
  Activity,
  Loader2,
} from "lucide-react";
import { fetchAnalytics, type AnalyticsData } from "../../lib/analytics";

// ─── Estilo escuro compartilhado ──────────────────────────────────────────────

const AXIS = { stroke: "#475569", fontSize: 11 };
const GRID = "#1e293b";
const TOOLTIP_STYLE = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};
const PIE_COLORS = [
  "#14b8a6",
  "#8b5cf6",
  "#f59e0b",
  "#0ea5e9",
  "#f43f5e",
  "#22c55e",
  "#eab308",
  "#64748b",
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function ChartCard({
  icon,
  title,
  desc,
  children,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4">
        <div className={`flex items-center gap-2 ${color}`}>
          {icon}
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        </div>
        {desc && <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function AnalyticsSection() {
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: () => fetchAnalytics(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando analytics…
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-sm text-rose-400 py-10 text-center">Erro ao carregar analytics.</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-100">Analytics</h1>
        <p className="text-xs text-slate-500">Visão de crescimento, receita e uso do produto</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Crescimento de usuários */}
        <ChartCard
          icon={<TrendingUp className="h-4 w-4" />}
          title="Crescimento de usuários"
          desc="Total acumulado de médicos (6 meses)"
          color="text-emerald-400"
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={data.crescimentoAcum}
              margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gGrow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="mes" {...AXIS} />
              <YAxis allowDecimals={false} {...AXIS} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="valor"
                name="Médicos"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gGrow)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Receita por mês */}
        <ChartCard
          icon={<DollarSign className="h-4 w-4" />}
          title="Receita por mês"
          desc="Pagamentos de pacientes processados (6 meses)"
          color="text-teal-400"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.receita} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="mes" {...AXIS} />
              <YAxis {...AXIS} tickFormatter={(v) => `R$${v}`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatBRL(v)} />
              <Bar dataKey="valor" name="Receita" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cancelamentos */}
        <ChartCard
          icon={<UserX className="h-4 w-4" />}
          title="Cancelamentos"
          desc="Assinaturas canceladas por mês"
          color="text-rose-400"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={data.cancelamentos}
              margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="mes" {...AXIS} />
              <YAxis allowDecimals={false} {...AXIS} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="valor"
                name="Cancelamentos"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ r: 3, fill: "#f43f5e" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Conversão trial → pago */}
        <ChartCard
          icon={<Target className="h-4 w-4" />}
          title="Conversão trial → pago"
          desc="Distribuição de assinaturas por estado"
          color="text-violet-400"
        >
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Pagantes", value: data.conversao.ativo },
                    { name: "Em trial", value: data.conversao.trial },
                    { name: "Cancelados", value: data.conversao.cancelado },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#0ea5e9" />
                  <Cell fill="#f43f5e" />
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-3xl font-bold text-violet-300 leading-none">
                  {data.conversao.taxaConversao}%
                </p>
                <p className="text-[11px] text-slate-500 mt-1">taxa de conversão</p>
              </div>
              <div className="space-y-1.5 text-xs">
                <LegendRow color="#22c55e" label="Pagantes" value={data.conversao.ativo} />
                <LegendRow color="#0ea5e9" label="Em trial" value={data.conversao.trial} />
                <LegendRow color="#f43f5e" label="Cancelados" value={data.conversao.cancelado} />
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Especialidades mais comuns */}
        <ChartCard
          icon={<Stethoscope className="h-4 w-4" />}
          title="Especialidades mais comuns"
          desc="Top especialidades dos médicos cadastrados"
          color="text-amber-400"
        >
          {data.especialidades.length === 0 ? (
            <p className="text-xs text-slate-500 py-16 text-center">Sem dados ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.especialidades}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} {...AXIS} />
                <YAxis type="category" dataKey="nome" width={90} {...AXIS} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#1e293b55" }} />
                <Bar dataKey="total" name="Médicos" radius={[0, 4, 4, 0]}>
                  {data.especialidades.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Uso das funções */}
        <ChartCard
          icon={<Activity className="h-4 w-4" />}
          title="Uso das funções do app"
          desc="% de médicos que usam cada recurso"
          color="text-sky-400"
        >
          <div className="space-y-3 py-1">
            {data.usoFuncoes.map((f) => (
              <div key={f.funcao}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300">{f.funcao}</span>
                  <span className="text-xs text-slate-500">
                    {f.total} <span className="text-slate-600">({f.pct}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500"
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-slate-400">{label}</span>
      <span className="ml-auto font-semibold text-slate-200">{value}</span>
    </div>
  );
}
