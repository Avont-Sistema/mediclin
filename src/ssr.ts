/**
 * Custom SSR entry that wraps TanStack Start with Clerk authentication.
 *
 * createClerkHandler intercepts each request before the HTML stream is sent,
 * authenticates it with Clerk (using CLERK_SECRET_KEY), and injects
 * { clerkInitialState } into the router context. ClerkProvider reads this
 * from the context to skip a client-side re-auth round-trip, preventing the
 * flash of unauthenticated content on initial SSR load.
 */
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createClerkHandler } from "@clerk/tanstack-start/server";

// createClerkHandler wraps the start-handler factory: the resulting function
// takes a stream-callback (defaultStreamHandler) and returns a RequestHandler.
// The cast is needed because Clerk's types reference the older Vinxi EventHandler
// while TanStack Start v1.x returns RequestHandler — the runtime shapes match.
const clerkHandler = createClerkHandler(
  createStartHandler as unknown as Parameters<typeof createClerkHandler>[0],
);

const fetch = clerkHandler(defaultStreamHandler) as unknown as (
  request: Request,
  ...args: unknown[]
) => Promise<Response>;

export default { fetch };
