// App domain configuration
// Update this when changing the domain
export const APP_DOMAIN = process.env.APP_DOMAIN ?? "localhost:3000";

// Build the full URL for a professional's public page
export function getPublicPageUrl(slug: string): string {
  const protocol = APP_DOMAIN.includes("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${APP_DOMAIN}`;
}
