import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  fetchRoleTabPermissions,
  updateRoleTabPermission,
  type RolePermissionMatrix,
} from "../../lib/role-permissions";

const ROLE_LABEL: Record<string, string> = {
  financeiro:  "Financeiro",
  suporte:     "Suporte",
  comercial:   "Comercial",
  operacional: "Operacional",
};

export function PermissoesSection() {
  const qc = useQueryClient();

  const { data: matrix, isLoading } = useQuery({
    queryKey: ["role-tab-permissions"],
    queryFn: () => fetchRoleTabPermissions(),
  });

  const toggle = useMutation({
    mutationFn: (vars: { role: "financeiro" | "suporte" | "comercial" | "operacional"; tabId: string; visivel: boolean }) =>
      updateRoleTabPermission({ data: vars }),
    onMutate: async (vars) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ["role-tab-permissions"] });
      const prev = qc.getQueryData<RolePermissionMatrix>(["role-tab-permissions"]);
      qc.setQueryData<RolePermissionMatrix>(["role-tab-permissions"], (old) =>
        old?.map((row) =>
          row.role !== vars.role
            ? row
            : {
                ...row,
                tabs: row.tabs.map((t) =>
                  t.tabId !== vars.tabId ? t : { ...t, visivel: vars.visivel },
                ),
              },
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["role-tab-permissions"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["role-tab-permissions"] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!matrix) return null;

  // Coleta todas as abas (primeira linha é referência)
  const allTabs = matrix[0]?.tabs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-100">Permissões por cargo</h1>
        <p className="text-xs text-slate-500">
          Configure quais abas cada cargo pode acessar. Super admin sempre vê tudo.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 w-44">
                Aba
              </th>
              {matrix.map((row) => (
                <th
                  key={row.role}
                  className="px-4 py-3 text-center text-xs font-semibold text-slate-400 min-w-[110px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
                    {ROLE_LABEL[row.role]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTabs.map((tab, i) => (
              <tr
                key={tab.tabId}
                className={`border-t border-slate-800 ${i % 2 === 0 ? "" : "bg-slate-900/40"}`}
              >
                <td className="px-4 py-2.5 text-sm text-slate-300">{tab.label}</td>
                {matrix.map((row) => {
                  const cell = row.tabs.find((t) => t.tabId === tab.tabId);
                  const visivel = cell?.visivel ?? false;
                  return (
                    <td key={row.role} className="px-4 py-2.5 text-center">
                      <button
                        onClick={() =>
                          toggle.mutate({ role: row.role as "financeiro" | "suporte" | "comercial" | "operacional", tabId: tab.tabId, visivel: !visivel })
                        }
                        disabled={toggle.isPending}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          visivel ? "bg-teal-600" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                            visivel ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-600">
        Alterações têm efeito imediato — o usuário verá a mudança na próxima navegação.
      </p>
    </div>
  );
}
