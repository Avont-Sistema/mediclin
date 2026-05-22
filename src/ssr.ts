/**
 * TanStack Start SSR with Clerk authentication.
 */
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createClerkHandler } from "@clerk/tanstack-start/server";

const clerkHandler = createClerkHandler(
  createStartHandler as unknown as Parameters<typeof createClerkHandler>[0],
);

const fetch = clerkHandler(defaultStreamHandler) as unknown as (
  request: Request,
  ...args: unknown[]
) => Promise<Response>;

export default { fetch };
