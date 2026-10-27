import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session?.user) {
        throw redirect({ to: "/auth" });
      }
      return { user: data.session.user };
    } catch (err) {
      if (err && typeof err === "object" && ("to" in err || "isRedirect" in err || "href" in err)) {
        throw err;
      }
      throw redirect({ to: "/auth" });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
