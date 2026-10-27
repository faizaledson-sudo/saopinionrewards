import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Crown, Flame, ShieldCheck, Smartphone } from "lucide-react";
import { dismissPendingPopup, getPendingTasks } from "@/lib/account.functions";
import { useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ICONS: Record<string, typeof Crown> = {
  kyc: ShieldCheck,
  mpesa: Smartphone,
  upgrade: Crown,
  charge: AlertTriangle,
};

export function PendingTasksDialog() {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const dismiss = useServerFn(dismissPendingPopup);

  const { data } = useQuery({
    queryKey: ["pending-tasks"],
    queryFn: () => getPendingTasks(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => dismiss(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pending-tasks"] }),
  });

  const createdAt = me?.profile?.created_at ? new Date(me.profile.created_at).getTime() : 0;
  const isNewAccount = !createdAt || (Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000) || (me?.profile?.streak_days ?? 0) <= 1;

  useEffect(() => {
    if (data && !data.popupSeen && data.items.length > 0 && !isNewAccount) {
      setOpen(true);
    }
  }, [data, isNewAccount]);

  function close() {
    setOpen(false);
    mutation.mutate();
  }

  // Never display on new accounts or if there are no pending tasks
  if (isNewAccount || !data?.items.length) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Welcome back!</DialogTitle>
        </DialogHeader>

        {data.streak > 1 ? (
          <div className="flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
            <Flame className="size-4 text-warning" />
            {data.streak}-day streak — keep it alive today.
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          A few things are still pending on your account:
        </p>

        <ul className="space-y-2">
          {data.items.map((item) => {
            const Icon = ICONS[item.kind] ?? AlertTriangle;
            return (
              <li key={item.kind} className="rounded-xl border border-border p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Button asChild size="sm" variant="secondary" onClick={close}>
                    <Link to={item.href}>Fix</Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        <Button variant="ghost" onClick={close}>
          Later
        </Button>
      </DialogContent>
    </Dialog>
  );
}
