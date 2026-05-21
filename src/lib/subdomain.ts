import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getWebRequest } from "vinxi/http";
import { db } from "../db";
import { professionals, services } from "../db/schema";

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Extracts the subdomain slug from a Host header.
 *
 * Production:  dr-ricardo.mediclin.app  → "dr-ricardo"
 * Local dev:   dr-test.localhost:3000   → "dr-test"
 * Root domain: mediclin.app             → null
 */
export function getSubdomain(host: string): string | null {
  const hostname = host.split(":")[0]; // strip port
  const baseDomain = process.env.APP_DOMAIN ?? "mediclin.app";
  const reserved = new Set(["www", "app", "dashboard", "api"]);

  // Production: *.mediclin.app
  if (hostname.endsWith(`.${baseDomain}`)) {
    const sub = hostname.slice(0, hostname.length - baseDomain.length - 1);
    if (sub && !reserved.has(sub)) return sub;
  }

  // Local dev: *.localhost
  if (hostname !== "localhost" && hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, hostname.length - ".localhost".length);
    if (sub && !reserved.has(sub)) return sub;
  }

  return null;
}

/**
 * Builds the public URL for a professional.
 *
 * If APP_DOMAIN is set (production): https://slug.APP_DOMAIN
 * Otherwise (local dev):             /slug
 */
export function buildPublicUrl(slug: string): string {
  const domain = process.env.APP_DOMAIN;
  if (domain) return `https://${slug}.${domain}`;
  return `/${slug}`;
}

// ─── Server function ──────────────────────────────────────────────────────────

type PublicProfileResult =
  | { mode: "landing" }
  | { mode: "not_found" }
  | {
      mode: "professional";
      professional: NonNullable<Awaited<ReturnType<typeof loadProfessional>>>;
    };

async function loadProfessional(slug: string) {
  return db.query.professionals.findFirst({
    where: and(eq(professionals.slug, slug), eq(professionals.ativo, true)),
    with: {
      services: {
        where: eq(services.ativo, true),
        orderBy: (s, { asc }) => [asc(s.criadoEm)],
      },
    },
  });
}

/**
 * Detects if the current request comes from a professional's subdomain.
 * Returns a discriminated union so the index route can decide what to render.
 */
export const fetchPublicProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicProfileResult> => {
    const req = getWebRequest();
    const host = req.headers.get("host") ?? "";
    const slug = getSubdomain(host);
    if (!slug) return { mode: "landing" };

    const professional = await loadProfessional(slug);
    if (!professional) return { mode: "not_found" };

    return { mode: "professional", professional };
  },
);
