import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const prof = await db.query.professionals.findFirst({
  where: eq(schema.professionals.slug, "felipe1"),
  with: { cards: true, services: true },
});

console.log("Profissional felipe1:");
console.log("  nome:", prof?.nomeCompleto);
console.log("  headline:", prof?.headline);
console.log("  destaque:", prof?.headlineDestaque);
console.log("  cor:", prof?.corPrimaria);
console.log("\nCards (", prof?.cards.length, "):");
for (const c of prof?.cards ?? []) {
  console.log(`  [${c.ordem}] ${c.tipo}: ${c.titulo} → ${c.subtitulo ?? "(sem subtítulo)"}`);
}
console.log("\nServiços (", prof?.services.length, "):");
for (const s of prof?.services ?? []) {
  console.log(`  - ${s.nome} — R$ ${s.preco}`);
}

process.exit(0);
