/**
 * TanStack Start SSR without Clerk.
 */
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

const fetch = createStartHandler(defaultStreamHandler) as unknown as (
  request: Request,
  ...args: unknown[]
) => Promise<Response>;

export default { fetch };
