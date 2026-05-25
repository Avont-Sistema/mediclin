import { put } from "@vercel/blob";
import { getAuth } from "@clerk/tanstack-start/server";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function handleUploadFoto(req: Request): Promise<Response> {
  const auth = await getAuth(req as Parameters<typeof getAuth>[0]);
  if (!auth.userId) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, auth.userId),
    with: { professional: true },
  });
  if (!user?.professional?.id) {
    return Response.json({ error: "Profissional não encontrado" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Campo 'file' ausente" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "Tipo de arquivo não suportado. Use JPEG, PNG ou WebP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return Response.json({ error: "Arquivo muito grande. Máximo 5 MB." }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const pathname = `fotos/${user.professional.id}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return Response.json({ url: blob.url });
}
