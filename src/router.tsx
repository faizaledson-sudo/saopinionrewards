import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 60 seconds fresh data
        gcTime: 5 * 60 * 1000, // 5 minutes cache retention
        refetchOnWindowFocus: false, // Do NOT hammer Vercel/Supabase when mobile users switch apps
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 60 * 1000,
  });

  return router;
};
