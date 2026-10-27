import { createFileRoute } from "@tanstack/react-router";
import { runAutomatedRecoveryScan } from "@/lib/sms.functions";

export const Route = createFileRoute("/api/public/cron/recovery")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const secret = url.searchParams.get("key") || url.searchParams.get("token");

        // Optional protection: if CRON_SECRET is set in env, verify it
        const expectedSecret = process.env.CRON_SECRET;
        if (expectedSecret && secret !== expectedSecret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const result = await runAutomatedRecoveryScan();
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      POST: async ({ request }) => {
        try {
          const result = await runAutomatedRecoveryScan();
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
