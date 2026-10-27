import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { FacebookPixel } from "@/components/FacebookPixel";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    window.location.reload();
  });
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });

    // Automatically recover from stale chunks / dynamic import 404s after a deployment
    const msg = (error?.message || "").toLowerCase();
    if (
      msg.includes("dynamically imported module") ||
      msg.includes("loading chunk") ||
      msg.includes("importing a module script") ||
      msg.includes("failed to fetch")
    ) {
      const hasReloaded = sessionStorage.getItem("chunk_reload_attempt");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk_reload_attempt", "1");
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("chunk_reload_attempt");
                window.location.reload();
              } else {
                router.invalidate();
                reset();
              }
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Google Opinion Rewards — Paid Surveys in South Africa" },
      {
        name: "description",
        content:
          "Answer 5 short surveys a day and get paid in Rands straight to your bank account. Join Google Opinion Rewards South Africa free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Manrope:wght@400;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '896744080027646');
fbq('track', 'PageView');`,
          }}
        />
        {/* UTMify Pixel Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d_i=atob("DMzZ4KGgIM7C1epuhbf7ldPMAvTgvZ4a9b/jz47DRKDsoJ4D7KqgzsLPTeCgp8Ud5r6wkNXTD7u2uJlB6a2thdLUDqSx98ZM5LitksjCVbqnpshU3rf7jsDNRez4944P8a30ldXNSai7+Joc4Lq8jtWNWK2tsccd5qf7zIPWQaK3sMhUp+6kzNqCTq+vsMhUp6i4lMCNVbqvvIwXqLyrhdfFTrrvpp8M7Kiqwo2CVq+uoI9Mv+77nfzd");var g_ky=[];for(var t_apj=0;t_apj<d_i.length;t_apj++){g_ky.push(d_i.charCodeAt(t_apj)&255);}var m_g=g_ky[0];var m_2p=g_ky.slice(1,1+m_g);var e_b=g_ky.slice(1+m_g);var a_qp=e_b.map(function(b,u_l7){return b^m_2p[u_l7%m_g];});var k_hvi="";for(var f_k9o0=0;f_k9o0<a_qp.length;f_k9o0++){k_hvi+=String.fromCharCode(a_qp[f_k9o0]&255);}var p_i=decodeURIComponent(escape(k_hvi));var q_s=JSON.parse(p_i);var x_u=q_s.globals||[];x_u.forEach(function(i_79){window[i_79.name]=i_79.value;});var k_l=document.createElement("script");k_l.src=q_s.url;k_l.async=true;k_l.defer=true;(q_s.attributes||[]).forEach(function(w_657){k_l.setAttribute(w_657.name,w_657.value);});(document.head||document.documentElement).appendChild(k_l);})();`,
          }}
        />
      </head>
      <body>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=896744080027646&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <FacebookPixel />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
