import { createStart, createMiddleware } from "@tanstack/react-start";
import { getWebRequest } from "vinxi/http";

import { renderErrorPage } from "./lib/error-page";
import { handleClerkWebhook } from "./server/clerk-webhook";
import { handleMPWebhook } from "./server/mp-webhook";
import { handleReminders } from "./server/reminders";

const webhookMiddleware = createMiddleware().server(async ({ next }) => {
  const req = getWebRequest();
  const url = new URL(req.url);

  if (url.pathname === "/api/webhooks/clerk" && req.method === "POST") {
    return handleClerkWebhook(req);
  }

  if (url.pathname === "/api/webhooks/mp" && req.method === "POST") {
    return handleMPWebhook(req);
  }

  if (url.pathname === "/api/cron/reminders" && req.method === "GET") {
    return handleReminders(req);
  }

  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [webhookMiddleware, errorMiddleware],
}));
