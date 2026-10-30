import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck,
  HelpCircle,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { getPublicConfig } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OpinionPanelLogo } from "@/components/BrandMark";

const configQuery = queryOptions({
  queryKey: ["public-config"],
  queryFn: () => getPublicConfig(),
});

export const Route = createFileRoute("/")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(configQuery),
  head: () => ({
    meta: [
      { title: "Google Opinion Rewards — Consumer Research & Media Evaluation" },
      {
        name: "description",
        content:
          "Join South Africa's leading rewards and consumer research community. Evaluate video media, review brand campaigns, and share insights on digital experiences.",
      },
      { property: "og:title", content: "Google Opinion Rewards — Consumer Research & Media Evaluation" },
      {
        property: "og:description",
        content:
          "Independent consumer research panel in South Africa. Review digital media campaigns and participate in verified research studies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button variant="outline" asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Page not found</div>,
});

function Landing() {
  useSuspenseQuery(configQuery);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-700">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
          <Link to="/" className="flex items-center gap-2">
            <OpinionPanelLogo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 font-medium text-xs sm:text-sm"
            >
              <Link to="/auth">Log in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-xs text-xs sm:text-sm px-3.5 sm:px-4 rounded-xl"
            >
              <Link to="/auth" search={{ mode: "signup" }}>
                Join Community Panel
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-white px-4 pb-16 pt-10 sm:pb-24 sm:pt-16 text-slate-900">
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[480px] w-[750px] -translate-x-1/2 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 text-center lg:text-left">
            <Badge className="border border-blue-200 bg-blue-50 px-3 py-1 text-xs sm:text-sm font-semibold text-blue-700 shadow-none inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-blue-600" /> South Africa's Consumer Research Community 🇿🇦
            </Badge>

            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 text-balance leading-tight">
              Shape Digital Media.{" "}
              <span className="text-blue-600 block sm:inline">Evaluate Content &amp; Local Brands.</span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base lg:text-lg text-slate-600 mx-auto lg:mx-0 leading-relaxed">
              Join South Africa's independent consumer research panel. Share feedback on upcoming commercial
              previews, rate mobile media experiences, and help leading organizations improve customer engagement.
            </p>

            {/* Program Details Box */}
            <div className="rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 shadow-soft max-w-lg mx-auto lg:mx-0 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                  <FileCheck className="size-3.5 text-blue-600" /> Active Research Program
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                  Open Registration
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
                <div>
                  <p className="text-[11px] text-slate-500">Study Format</p>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900">Mobile Video</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Avg. Time</p>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900">2-3 Mins</p>
                </div>
                <div className="bg-blue-50/80 border border-blue-100 p-2 rounded-xl text-center">
                  <p className="text-[10px] text-blue-700 font-bold uppercase">Coverage</p>
                  <p className="text-xs sm:text-sm font-black text-blue-600">Nationwide 🇿🇦</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto h-12 px-6 sm:px-8 text-sm sm:text-base font-extrabold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all hover:shadow-lg rounded-xl"
              >
                <Link to="/auth" search={{ mode: "signup" }}>
                  Register as Panelist
                  <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-semibold text-sm sm:text-base rounded-xl"
              >
                <Link to="/auth">Member Portal Login</Link>
              </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-lg mx-auto lg:mx-0 pt-4 text-center">
              <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-soft">
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Monthly Studies</p>
                <p className="text-sm sm:text-lg font-black text-blue-600">250+</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-soft">
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Active Members</p>
                <p className="text-sm sm:text-lg font-black text-blue-600">45,000+</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-soft">
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Location</p>
                <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                  <Smartphone className="size-3 text-blue-600" /> South Africa
                </p>
              </div>
            </div>
          </div>

          {/* Right Smartphone UI Mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="relative rounded-[2.5rem] border-4 border-slate-200 bg-white p-5 shadow-xl text-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-blue-50 border border-blue-200 grid place-items-center text-xs font-bold text-blue-600">
                    SM
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Sipho M.</p>
                    <p className="text-[10px] text-slate-400">Verified Panelist 🇿🇦</p>
                  </div>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                  Accredited
                </Badge>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 space-y-1 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="size-3.5 text-blue-200" /> Member Status
                  </span>
                  <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <p className="font-display text-2xl font-extrabold text-white">Verified Contributor</p>
                <p className="text-[11px] text-blue-100">
                  Accredited for South African media &amp; consumer brand studies
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-blue-600" /> Daily Video Evaluations
                  </span>
                  <span className="font-bold text-blue-600">Completed</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full w-full bg-blue-600 rounded-full" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>5 of 5 video sessions submitted</span>
                  <span>Feedback validated</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Completed Evaluations
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100/80 p-2.5 text-xs">
                    <span className="flex items-center gap-2 text-slate-700 font-medium">
                      <Play className="size-3.5 text-blue-600" /> Retail Brand Video Study
                    </span>
                    <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-200 bg-blue-50">
                      Submitted
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100/80 p-2.5 text-xs">
                    <span className="flex items-center gap-2 text-slate-700 font-medium">
                      <Video className="size-3.5 text-blue-600" /> Mobile App UX Evaluation
                    </span>
                    <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-200 bg-blue-50">
                      Submitted
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3 text-center text-xs font-semibold text-blue-900 shadow-none flex items-center justify-center gap-2">
                <Users className="size-4 text-blue-600" />
                <span>Active across Gauteng, Western Cape &amp; KZN</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-16 bg-white">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <Badge className="border border-blue-200 bg-blue-50 text-blue-700 font-semibold">
              Research Process
            </Badge>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-900">
              How The Panel Works
            </h2>
            <p className="text-sm text-slate-500">
              Join leading organizations and consumer brand studies in four simple steps.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Users,
                step: "1",
                title: "Register Your Profile",
                text: "Create your reviewer profile in 30 seconds. No complex requirements or delays.",
              },
              {
                icon: Play,
                step: "2",
                title: "Access Video Studies",
                text: "Watch short digital previews, brand campaigns and consumer media on your phone.",
              },
              {
                icon: CheckCircle2,
                step: "3",
                title: "Submit Feedback",
                text: "Answer concise evaluation questions regarding content clarity, appeal and user experience.",
              },
              {
                icon: ShieldCheck,
                step: "4",
                title: "Accredited Panel Status",
                text: "Maintain an active verified reviewer standing to qualify for ongoing research initiatives.",
              },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="border-slate-100 bg-white hover:border-blue-200 shadow-soft relative overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-600">
                      <item.icon className="size-5" />
                    </span>
                    <span className="text-2xl font-black text-slate-200 font-display">0{item.step}</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3 Pillars Section */}
      <section className="px-4 py-12 bg-slate-50/70 border-y border-slate-100">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="flex items-start gap-3 justify-center sm:justify-start">
              <ShieldCheck className="size-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-slate-900">POPIA Compliant Privacy</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Participant data is handled strictly in accordance with South African privacy regulations.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 justify-center sm:justify-start">
              <CheckCircle2 className="size-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-slate-900">Verified Consumer Research</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Studies are commissioned by organizations seeking authentic consumer opinions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 justify-center sm:justify-start">
              <Smartphone className="size-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-slate-900">100% Mobile Optimized</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Participate easily from your smartphone anywhere in South Africa with minimal data usage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 bg-white">
        <div className="mx-auto max-w-4xl rounded-3xl border-2 border-blue-100 bg-gradient-to-b from-blue-50/60 to-blue-50/20 p-8 sm:p-12 text-center text-slate-900 shadow-soft relative overflow-hidden space-y-5">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1 font-bold text-xs">
            Open Registrations
          </Badge>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Join South Africa's Consumer Panel Today
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
            Be part of a nationwide network of panel participants sharing honest feedback on digital media and brand
            experiences.
          </p>
          <div className="pt-2">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 font-extrabold text-base bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all hover:shadow-lg rounded-xl"
            >
              <Link to="/auth" search={{ mode: "signup" }}>
                Register as Panelist
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-4 py-10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">Google Opinion Rewards 🇿🇦</p>
            <p className="text-xs">
              &copy; {new Date().getFullYear()} Google Opinion Rewards. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              to="/support"
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline"
            >
              <HelpCircle className="size-4" /> Member Support &amp; Help Desk
            </Link>
            <Link to="/auth" className="text-slate-600 hover:text-blue-600 hover:underline">
              Member Login
            </Link>
          </div>
        </div>
      </footer>

      {/* Floating Support Button */}
      <Link
        to="/support"
        aria-label="Member Support & Help Desk"
        className="fixed bottom-5 right-5 z-40 grid size-12 sm:size-14 place-items-center rounded-full bg-blue-600 text-white shadow-lift hover:scale-105 transition-transform"
      >
        <HelpCircle className="size-6" />
      </Link>
    </div>
  );
}
