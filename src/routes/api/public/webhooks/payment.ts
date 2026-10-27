import { createFileRoute } from "@tanstack/react-router";
import { Route as WebhookRoute } from "./webhook";

export const Route = createFileRoute("/api/public/webhooks/payment")({
  server: {
    handlers: {
      GET: async (args) => {
        const handler = (WebhookRoute.options as any)?.server?.handlers?.GET;
        if (handler) return handler(args);
        return new Response(JSON.stringify({ ok: true, endpoint: "/api/public/webhooks/payment" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: async (args) => {
        const handler = (WebhookRoute.options as any)?.server?.handlers?.POST;
        if (handler) return handler(args);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    },
  },
});
