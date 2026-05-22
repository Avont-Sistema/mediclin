/**
 * Custom SSR entry for TanStack Start (Clerk optional).
 */
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

let clerkHandler: ((handler: any) => any) | null = null;

async function initializeClerk() {
  try {
    const { createClerkHandler } = await import("@clerk/tanstack-start/server");
    clerkHandler = createClerkHandler(createStartHandler as unknown as any);
  } catch (error) {
    console.error("[SSR] Clerk not available, using basic SSR");
  }
}

initializeClerk();

const fetch = async (request: Request, ...args: unknown[]) => {
  const handler = clerkHandler ? clerkHandler(defaultStreamHandler) : createStartHandler(defaultStreamHandler);
  return handler(request, ...args);
};

export default { fetch };
