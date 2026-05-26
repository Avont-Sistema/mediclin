import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";

interface PhotoUploadProps {
  currentUrl: string | null;
  name: string;
  onUploaded: (url: string) => void;
  onRemove?: () => void;
  size?: "sm" | "lg";
}

export function PhotoUpload({
  currentUrl,
  name,
  onUploaded,
  onRemove,
  size = "lg",
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  const sizeClass = size === "lg" ? "size-28" : "size-16";
  const iconSize = size === "lg" ? "size-10" : "size-6";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (file.size > 5 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo 5 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use JPEG, PNG ou WebP.");
      return;
    }

    // Show instant local preview
    setPreview(URL.createObjectURL(file));
    setError(null);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload-foto", { method: "POST", body: form });
      // Guard: if response isn't JSON (e.g. unexpected HTML error page), surface a clean message
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Erro no servidor (${res.status}). Tente novamente.`);
      }
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? `Erro ${res.status} no upload`);
      onUploaded(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload. Tente novamente.");
      setPreview(currentUrl); // roll back preview
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    setPreview(null);
    onRemove?.();
    onUploaded("");
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Photo circle / drag target */}
      <div className="relative group">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`${sizeClass} rounded-full overflow-hidden border-2 border-dashed border-slate-300 hover:border-teal-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2`}
          title="Clique para alterar a foto"
        >
          {preview ? (
            <img src={preview} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <span className={size === "lg" ? "text-3xl font-bold text-white" : "text-lg font-bold text-white"}>
                {initials}
              </span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            {uploading ? (
              <Loader2 className={`${iconSize} text-white animate-spin`} />
            ) : (
              <Camera className={`${size === "lg" ? "size-7" : "size-4"} text-white`} />
            )}
          </div>
        </button>

        {/* Remove button */}
        {preview && !uploading && onRemove !== undefined && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -bottom-1 -right-1 size-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-colors"
            title="Remover foto"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {/* Upload button text */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="size-3.5" />
              {preview ? "Trocar foto" : "Adicionar foto"}
            </>
          )}
        </button>
        <p className="text-xs text-slate-400 mt-0.5">JPEG, PNG ou WebP · máx. 5 MB</p>
        {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
