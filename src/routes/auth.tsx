import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Gift, Loader2, Lock, Mail, ShieldCheck, Smartphone, Sparkles, UserPlus } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapProfile, getPublicConfig, registerUser } from "@/lib/account.functions";
import { trackEvent } from "@/lib/fbpixel";
import { formatKes, normalizePhone, phoneToEmail } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { BrandLogo } from "@/components/BrandMark";

const configQuery = queryOptions({
  queryKey: ["public-config"],
  queryFn: () => getPublicConfig(),
});

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(configQuery),
  head: () => ({
    meta: [
      { title: "Log in or join — Google Opinion Rewards South Africa" },
      {
        name: "description",
        content:
          "Create your Google Opinion Rewards account with your email and claim your welcome bonus, or log back in to answer today's surveys.",
      },
      { property: "og:title", content: "Log in or join — Google Opinion Rewards South Africa" },
      {
        property: "og:description",
        content: "Email and password. That's all you need to start earning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: config } = useQuery(configQuery);
  const welcomeBonus = config?.settings?.welcome_bonus_kes ?? 300;

  const bootstrap = useServerFn(bootstrapProfile);
  const register = useServerFn(registerUser);
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referral, setReferral] = useState(search.ref ?? "");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const raw = identifier.trim();
    if (!raw) {
      toast.error(
        mode === "signup"
          ? "Please enter your South African mobile number or email."
          : "Please enter your mobile number or email."
      );
      return;
    }

    const isEmail = raw.includes("@");
    const normalizedPhone = normalizePhone(raw);

    if (mode === "signup") {
      if (!normalizedPhone && !isEmail) {
        toast.error("Please enter a valid South African mobile number (e.g. 082 123 4567) or email.");
        return;
      }
    } else {
      if (!isEmail && !normalizedPhone) {
        toast.error("Please enter a valid South African mobile number or email.");
        return;
      }
    }

    if (password.length < 6) {
      toast.error("Your password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const rawClean = raw.replace(/^["'“”]|["'“”]$/g, "").trim();
      let loginEmail = rawClean.toLowerCase();

      // Normalize admin identifiers to the exact admin email
      if (
        loginEmail === "faiza" ||
        loginEmail === "faiza.edson" ||
        loginEmail === "admin" ||
        loginEmail === "0820000001" ||
        loginEmail === "27820000001" ||
        loginEmail.includes("faiza.edson@")
      ) {
        loginEmail = "faiza.edson@gmail.com";
      } else if (normalizedPhone && !isEmail) {
        loginEmail = phoneToEmail(normalizedPhone);
      }

      const cleanPassword = password.replace(/^["'“”]|["'“”]$/g, "").trim();

      if (mode === "signup") {
        const regResult = await register({
          data: {
            phone: normalizedPhone || undefined,
            email: loginEmail,
            password: cleanPassword,
            referralCode: referral || undefined,
            fullName: fullName.trim() || undefined,
          },
        });

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: cleanPassword,
        });
        if (signInError) {
          toast.error(signInError.message);
          return;
        }

        trackEvent("CompleteRegistration", {
          content_name: "signup",
          status: true,
          eventID: regResult?.userId ? `reg_${regResult.userId}` : undefined,
        });
        toast.success(`Welcome aboard! Your ${formatKes(welcomeBonus)} bonus is in your wallet.`);
      } else {
        let authResult = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: cleanPassword,
        });

        // Fallback: try raw untrimmed password
        if (authResult.error && cleanPassword !== password) {
          authResult = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password,
          });
        }

        // Fallback: try casing variants for admin (e.g. 123456789.Jb vs 123456789.jb vs 123456789.JB)
        if (authResult.error && loginEmail === "faiza.edson@gmail.com") {
          for (const variant of ["123456789.Jb", "123456789.jb", "123456789.JB"]) {
            const vRes = await supabase.auth.signInWithPassword({
              email: loginEmail,
              password: variant,
            });
            if (!vRes.error) {
              authResult = vRes;
              break;
            }
          }
        }

        if (authResult.error) {
          toast.error(authResult.error.message || "Invalid login credentials. Please check your email and password.");
          return;
        }
        trackEvent("Login");
      }

      if (loginEmail === "faiza.edson@gmail.com") {
        await navigate({ to: "/admin" });
      } else {
        await navigate({ to: "/dashboard" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-white">
      <div className="hidden flex-col justify-between p-10 text-white lg:flex bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800">
        <Link to="/" className="flex items-center">
          <BrandLogo className="h-7 w-auto max-w-[220px]" containerClassName="bg-white py-1.5 px-3 border border-white/20 shadow-none rounded-xl" />
        </Link>
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold text-white uppercase tracking-wider backdrop-blur border border-white/25">
            <Sparkles className="size-3.5 text-amber-300" />
            <span>Special Member Offer</span>
          </div>
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Claim your R 300 bonus.
            <br />
            Earn every single day.
          </h2>
          <p className="mt-4 max-w-md text-white/90">
            Sign up in seconds and get an instant R 300 welcome bonus in your wallet. Review sponsor videos today to earn an additional R 3,500, withdrawable straight to your South African bank account.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <div className="inline-flex items-center gap-2.5 rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur border border-white/20">
              <span className="flex size-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-white">🎁 Instant R 300 Registration Bonus</span>
            </div>
            <div className="inline-flex items-center gap-2.5 rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur border border-white/20">
              <span className="flex size-2 rounded-full bg-sky-300" />
              <span className="text-xs font-semibold text-white">⚡ Today's 5 video tasks reward: R 3,500</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-white/70">Paid surveys & video reviews for South Africa 🇿🇦</p>
      </div>

      <div className="flex items-center justify-center bg-white px-4 py-12">
        <Card className="w-full max-w-md border-slate-200/80 shadow-soft bg-white">
          <CardContent className="p-6 sm:p-8">
            <Link to="/" className="mb-6 flex items-center lg:hidden">
              <BrandLogo className="h-6 w-auto max-w-[200px]" containerClassName="bg-white py-1.5 px-3 border border-slate-200/60 shadow-none rounded-lg" />
            </Link>

            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "signup"
                ? "Your welcome bonus lands in your wallet instantly."
                : "Log in with your mobile number and password."}
            </p>

            {mode === "signup" ? (
              <div className="mt-4 rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50 via-sky-50/50 to-indigo-50/80 p-3.5 sm:p-4 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shrink-0">
                      <Gift className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                          Welcome Bonus
                        </span>
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Instant
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Credited to your balance upon signup
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display text-2xl font-black text-blue-700">
                      +{formatKes(welcomeBonus)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-blue-200/60 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    <Sparkles className="size-3.5 text-amber-500" />
                    First 5 video tasks reward:
                  </span>
                  <span className="font-bold text-slate-900">+R 3,500</span>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Your name</Label>
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fullName"
                      className="pl-9"
                      placeholder="Lerato Ndlovu"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="identifier">
                    {mode === "signup" ? "Mobile Number or Email" : "Mobile number or Email"}
                  </Label>
                  {mode === "signup" && !identifier.includes("@") ? (
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <span>🇿🇦</span> +27
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <Smartphone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="identifier"
                    className="pl-9"
                    type={mode === "signup" && !identifier.includes("@") ? "tel" : "text"}
                    inputMode={mode === "signup" && !identifier.includes("@") ? "tel" : "text"}
                    autoComplete={mode === "signup" ? "tel" : "username"}
                    placeholder={mode === "signup" ? "082 123 4567 or name@email.com" : "082 123 4567 or you@email.com"}
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    required
                  />
                </div>
                {mode === "signup" && !identifier.includes("@") ? (
                  <p className="text-[11px] text-slate-500">
                    Use your active cellphone number (e.g. 082, 071, 079, 060...). Payout alerts will be sent via SMS.
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    <span>{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    className="pl-9 pr-10"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm" size="lg" disabled={busy}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {mode === "signup" ? `Create account & claim ${formatKes(welcomeBonus)} bonus` : "Log in"}
              </Button>

              {mode === "signup" ? (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                  <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Free registration • {formatKes(welcomeBonus)} bonus available immediately</span>
                </div>
              ) : null}
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              {mode === "signup" ? "Already registered?" : "New here?"}{" "}
              <button
                type="button"
                className="font-semibold text-blue-600 underline-offset-4 hover:underline hover:text-blue-700"
                onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              >
                {mode === "signup" ? "Log in" : "Create an account"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
