import { useState, useEffect } from "react";
import { Link as LinkIcon, Check, ExternalLink } from "lucide-react";

// ─── Caixa "Seu link público" ─────────────────────────────────────────────────
// A página pública é uma rota baseada em path (/:slug). No cliente, a URL real é
// sempre window.location.origin + "/" + slug — por isso copiamos a URL COMPLETA
// (e não só "/slug", que era o bug). Compartilhada entre Página Pública e Suporte.

export function PublicLinkBox({ slug, className = "" }: { slug: string; className?: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (!slug) return null;

  // URL completa para copiar/abrir; versão "limpa" (sem protocolo) só para exibir.
  const fullUrl = origin ? `${origin}/${slug}` : `/${slug}`;
  const displayUrl = origin ? `${origin.replace(/^https?:\/\//, "")}/${slug}` : `/${slug}`;

  const copy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border border-teal-200 bg-teal-50/60 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <LinkIcon className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-teal-900">Seu link público</h3>
      </div>
      <p className="text-xs text-teal-700 mb-3">Este é o link para colocar na bio do Instagram.</p>
      <div className="flex items-center gap-2 flex-wrap">
        <code className="flex-1 min-w-0 truncate rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs text-teal-800 font-mono">
          {displayUrl}
        </code>
        <button
          onClick={copy}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
          {copied ? "Copiado!" : "Copiar"}
        </button>
        <a
          href={fullUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white hover:bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700 transition"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>
      </div>
    </div>
  );
}
