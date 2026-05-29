import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envContent = readFileSync(join(root, ".env.local"), "utf8");
const match = envContent.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m);
const url = match[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const migrationFile = join(root, "src/db/migrations/0007_support_system.sql");
const content = readFileSync(migrationFile, "utf8");
const fileHash = createHash("sha256").update(content).digest("hex");

// Check if already applied
const tracked = await sql`SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${fileHash}`;
if (tracked.length > 0) {
  console.log("✅ Migration 0007_support_system already applied. Skipping.");
  process.exit(0);
}

console.log("Applying 0007_support_system.sql...\n");

// Split on --> statement-breakpoint
const statements = content
  .split(/--> statement-breakpoint/g)
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  try {
    await sql.query(stmt);
    console.log(`  ✅ ${stmt.slice(0, 60).replace(/\n/g, " ")}...`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      console.log(`  ⚠️  Already exists, skipping`);
    } else {
      console.error(`  ❌ Error: ${msg}`);
      throw err;
    }
  }
}

// Track in drizzle migrations
await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${fileHash}, ${Date.now()})`;
console.log("\n✅ Migration tracked in drizzle.__drizzle_migrations");
console.log("\n🎉 0007_support_system applied!\n");
