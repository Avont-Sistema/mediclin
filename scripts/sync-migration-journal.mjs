/**
 * sync-migration-journal.mjs
 * Updates _journal.json AND inserts missing hashes into drizzle.__drizzle_migrations
 * so that `drizzle-kit migrate` won't try to re-apply already-applied migrations.
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envContent = readFileSync(join(root, ".env.local"), "utf8");
const match = envContent.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m);
const url = match[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

// All migration files in application order
const MIGRATIONS = [
  { tag: "0000_smooth_clint_barton",    when: 1779331356961 },
  { tag: "0001_mp_marketplace",          when: 1779331356962 },
  { tag: "0002_lembretes",               when: 1779331356963 },
  { tag: "0003_customizacao_publica",    when: 1779331356964 },
  { tag: "0003_pagina_publica_cards",    when: 1779331356965 },
  { tag: "0004_clinic_members",          when: 1779331356966 },
  { tag: "0005_add_uf",                  when: 1779331356967 },
  { tag: "0006_add_cor_destaque",        when: 1779331356968 },
];

// Compute hashes
const migrations = MIGRATIONS.map((m, idx) => {
  const filePath = join(root, "src/db/migrations", `${m.tag}.sql`);
  const content = readFileSync(filePath, "utf8");
  const hash = createHash("sha256").update(content).digest("hex");
  return { ...m, idx, hash };
});

// ── 1. Update _journal.json ────────────────────────────────────────────────

const journalPath = join(root, "src/db/migrations/meta/_journal.json");
const journal = {
  version: "7",
  dialect: "postgresql",
  entries: migrations.map(({ idx, tag, when }) => ({
    idx,
    version: "7",
    when,
    tag,
    breakpoints: true,
  })),
};
writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n");
console.log("✅ _journal.json updated with", migrations.length, "entries");

// ── 2. Sync drizzle.__drizzle_migrations ─────────────────────────────────

const tracked = await sql`SELECT hash FROM drizzle.__drizzle_migrations`;
const trackedHashes = new Set(tracked.map((r) => r.hash));
console.log(`\nCurrently tracked: ${trackedHashes.size} migration(s)`);

let added = 0;
for (const { tag, hash, when } of migrations) {
  if (trackedHashes.has(hash)) {
    console.log(`  ✓ ${tag} (already tracked)`);
    continue;
  }
  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES (${hash}, ${when})
  `;
  console.log(`  ✅ ${tag} → inserted hash ${hash.slice(0, 12)}...`);
  added++;
}

console.log(`\n🎉 Done — inserted ${added} new migration record(s)\n`);
