import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  HelpCircle,
  MessageSquare,
  MessageCircle,
  ExternalLink,
  Send,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  CreditCard,
  PlaySquare,
  Sparkles,
  Inbox,
  UserCheck,
  BadgeAlert,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createTicket,
  getMyTickets,
  type SupportTicket,
  type TicketCategory,
} from "@/lib/support.functions";
import { useMe } from "@/components/AppShell";
import { formatKes } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Help Center & Support Desk — Google Opinion Rewards" },
      {
        name: "description",
        content:
          "Official South Africa member support center. Resolve questions on payouts, verification, daily tasks, and open support tickets.",
      },
    ],
  }),
  component: SupportPage,
});

type FaqItem = {
  id: string;
  category: TicketCategory;
  question: string;
  shortAnswer: string;
  fullSolution: string[];
};

const FAQ_LIST: FaqItem[] = [
  {
    id: "withdrawal_status",
    category: "payout_withdrawal",
    question: "When will my requested withdrawal reflect in my bank account?",
    shortAnswer: "Automated payouts via Instant EFT reflect immediately once your daily reviews and standard verification are validated.",
    fullSolution: [
      "Standard payouts are processed directly through the South African Interbank Settlement system (Instant EFT) to Capitec, FNB, Standard Bank, Nedbank, and Absa.",
      "Ensure you have completed all 5 of today's video reviews to keep your account active.",
      "First-time withdrawals require identity and banking verification to comply with SARB & FICA anti-fraud regulations.",
      "Once approved, payouts usually reflect within 5 to 30 minutes in your bank app.",
    ],
  },
  {
    id: "verification_hold",
    category: "verification_fica",
    question: "Why does my account show 'Verification Required' or refundable hold?",
    shortAnswer: "South African financial regulations require 1-time FICA account validation before your first interbank transfer.",
    fullSolution: [
      "To prevent automated bots and protect community funds, every member must verify their registered phone and banking details.",
      "Any standard nominal verification charge is completely refundable or credited directly into your verified wallet balance.",
      "Once verified, your account receives the 'Verified Member' badge and unlocks automated instant withdrawals forever.",
    ],
  },
  {
    id: "daily_tasks_reset",
    category: "daily_tasks",
    question: "How many video reviews can I complete per day and when do they reset?",
    shortAnswer: "Regular members receive 5 high-paying video reviews every single day. Daily tasks reset at midnight (00:00 SAST).",
    fullSolution: [
      "Each video review rewards up to R 700 upon watch completion.",
      "Make sure you watch the full video duration (15 seconds) until the green claim button appears.",
      "Your streak bonus increases for every consecutive day you log in and complete your tasks.",
    ],
  },
  {
    id: "vip_upgrade_perks",
    category: "account_upgrade",
    question: "What are the benefits of activating a VIP tier?",
    shortAnswer: "VIP members earn higher rewards per video, have lower payout cooldowns, and receive automated settlement priority.",
    fullSolution: [
      "VIP 1: Earn R 80+ per review, withdraw every 5 days.",
      "VIP 2: Earn R 180+ per review, withdraw every 3 days.",
      "VIP 3: Highest tier — earn R 400+ per review with daily instant withdrawals and priority support queue.",
    ],
  },
];

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  payout_withdrawal: "Withdrawal & Payouts",
  verification_fica: "Identity & FICA Verification",
  daily_tasks: "Video Reviews & Tasks",
  account_upgrade: "VIP Plan & Upgrades",
  general: "General Inquiry",
};

const STATUS_BADGES: Record<SupportTicket["status"], { label: string; className: string }> = {
  open: { label: "Open — In Queue", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  in_review: { label: "In Review by Agent", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  answered: { label: "Agent Replied 💬", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold" },
  resolved: { label: "Resolved", className: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
};

function SupportPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();

  const { data: tickets, isLoading: isLoadingTickets } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => getMyTickets(),
    staleTime: 15_000,
  });

  const createTicketFn = useServerFn(createTicket);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>("payout_withdrawal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [helpfulFaqs, setHelpfulFaqs] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"assistant" | "tickets">("assistant");

  const submitMutation = useMutation({
    mutationFn: () =>
      createTicketFn({
        data: {
          category: selectedCategory,
          subject: subject.trim(),
          message: message.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Support ticket submitted! An official agent has been assigned to your query.");
      setSubject("");
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      setActiveTab("tickets");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit ticket. Please try again.");
    },
  });

  const hasRepliedTickets = tickets?.some((t) => t.status === "answered");
  const whatsappUrl =
    me?.settings?.whatsapp_group_url?.trim() ||
    "https://whatsapp.com/channel/0029VbDsSRG11ulOPtzMXK2R";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Top Banner */}
      <header className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Support Desk Online
              </span>
              <Badge variant="outline" className="text-xs">
                South Africa Desk
              </Badge>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Member Support &amp; Help Center
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Find instant solutions to common payout and account queries below, join our official WhatsApp community, or submit a direct ticket for our specialized agents to review.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50 text-xs text-muted-foreground">
            <span>Avg Response: <strong className="text-foreground font-semibold">&lt; 15 mins</strong></span>
            <span>Account: <strong className="text-foreground font-semibold">{me?.profile?.phone || "Connected"}</strong></span>
          </div>
        </div>
      </header>

      {/* Official WhatsApp Community & Help Channel Card */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-card p-5 sm:p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#25D366] text-white shadow-md">
            <MessageCircle className="size-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-bold text-base sm:text-lg text-foreground">
                Official WhatsApp Community &amp; Help Desk
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Channel
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Connect directly with our South Africa community. Get instant task drop alerts, live payout proofs, and fast peer &amp; moderator assistance.
            </p>
          </div>
        </div>
        <div className="shrink-0 sm:self-center">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition-transform hover:scale-105 w-full sm:w-auto"
          >
            <MessageCircle className="size-4" />
            Join WhatsApp Channel
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 p-1.5 bg-muted/60 rounded-2xl h-auto">
          <TabsTrigger value="assistant" className="rounded-xl py-2.5 font-bold text-sm gap-2">
            <HelpCircle className="size-4" />
            Quick Solutions &amp; Open Ticket
          </TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-xl py-2.5 font-bold text-sm gap-2 relative">
            <Inbox className="size-4" />
            My Tickets
            {tickets && tickets.length > 0 ? (
              <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                hasRepliedTickets ? "bg-emerald-500 text-white animate-pulse" : "bg-primary/20 text-primary"
              }`}>
                {tickets.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Smart Solutions Filter + Ticket Creator */}
        <TabsContent value="assistant" className="space-y-6 focus-visible:outline-none">
          {/* Section 1: Interactive Self-Service Filter */}
          <Card className="rounded-3xl border shadow-soft overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles className="size-4" />
                Step 1: Check Common Solutions First
              </div>
              <CardTitle className="font-display text-xl">What do you need assistance with?</CardTitle>
              <CardDescription>
                Click any topic below to view immediate official instructions before creating a manual ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3">
              {FAQ_LIST.map((faq) => {
                const isOpen = activeFaq === faq.id;
                const isMarkedHelpful = helpfulFaqs[faq.id];

                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-border/70 bg-card overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                      className="flex w-full items-center justify-between p-4 text-left font-semibold text-sm hover:bg-muted/40 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                          ?
                        </span>
                        <span>{faq.question}</span>
                      </span>
                      {isOpen ? (
                        <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {isOpen ? (
                      <div className="border-t border-border/50 bg-muted/20 p-4 sm:p-5 space-y-3.5 text-sm">
                        <p className="font-medium text-foreground">{faq.shortAnswer}</p>
                        <ul className="space-y-1.5 text-xs text-muted-foreground list-disc pl-5">
                          {faq.fullSolution.map((step, idx) => (
                            <li key={idx} className="leading-relaxed">{step}</li>
                          ))}
                        </ul>

                        {/* Was this helpful feedback */}
                        <div className="border-t border-border/40 pt-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Did this resolve your question?</span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={isMarkedHelpful ? "default" : "outline"}
                              className="h-8 gap-1.5 text-xs font-semibold"
                              onClick={() => {
                                setHelpfulFaqs((prev) => ({ ...prev, [faq.id]: true }));
                                toast.success("Glad we could help! Your issue is resolved.");
                              }}
                            >
                              <ThumbsUp className="size-3.5" />
                              Yes, solved!
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedCategory(faq.category);
                                setSubject(`Help with: ${faq.question}`);
                                const element = document.getElementById("ticket-form");
                                element?.scrollIntoView({ behavior: "smooth" });
                              }}
                            >
                              <ThumbsDown className="size-3.5" />
                              No, talk to agent
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Section 2: Ticket Creation Form */}
          <div id="ticket-form">
            <Card className="rounded-3xl border shadow-soft">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <MessageSquare className="size-4" />
                  Step 2: Still need help? Open an official ticket
                </div>
                <CardTitle className="font-display text-xl">Describe your issue to an agent</CardTitle>
                <CardDescription>
                  Your ticket will be assigned to a verified support specialist. You can monitor the answer under the &quot;My Tickets&quot; tab.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Issue Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-xs"
                              : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Subject / Summary
                  </label>
                  <Input
                    placeholder="e.g. Inquiring about payout confirmation to Capitec"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                {/* Free Text Description Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Detailed Message
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {message.length} characters (min 10)
                    </span>
                  </div>
                  <Textarea
                    placeholder="Please explain what you experienced, including your bank name, reference number or any specific details so our agent can assist you immediately..."
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="rounded-2xl resize-none p-3.5 text-sm"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold gap-2 shadow-soft"
                    disabled={submitMutation.isPending || !subject.trim() || message.trim().length < 10}
                    onClick={() => submitMutation.mutate()}
                  >
                    {submitMutation.isPending ? (
                      "Assigning Agent..."
                    ) : (
                      <>
                        <Send className="size-4" />
                        Submit Support Ticket
                      </>
                    )}
                  </Button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 transition-colors py-1"
                  >
                    <MessageCircle className="size-3.5 text-[#25D366]" />
                    <span>Prefer live community chat? Open WhatsApp</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: My Tickets List & Replies */}
        <TabsContent value="tickets" className="space-y-4 focus-visible:outline-none">
          {isLoadingTickets ? (
            <div className="rounded-3xl border bg-card p-12 text-center text-sm text-muted-foreground">
              Loading your support tickets...
            </div>
          ) : !tickets || tickets.length === 0 ? (
            <Card className="rounded-3xl border p-12 text-center space-y-4">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
                <Inbox className="size-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold">No Support Tickets Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Whenever you need personalized help, open a ticket from the Solutions tab and an agent will reply here.
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-xl font-semibold"
                onClick={() => setActiveTab("assistant")}
              >
                Open Your First Ticket
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const badge = STATUS_BADGES[ticket.status] || STATUS_BADGES.open;
                const isAnswered = ticket.status === "answered" || Boolean(ticket.admin_reply);

                return (
                  <Card key={ticket.id} className="rounded-3xl border shadow-soft overflow-hidden">
                    <CardHeader className="p-5 pb-3 bg-muted/20 border-b border-border/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-muted-foreground">
                            #{String(ticket.ticket_number).padStart(4, "0")}
                          </span>
                          <Badge variant="outline" className="text-[11px] font-medium">
                            {CATEGORY_LABELS[ticket.category]}
                          </Badge>
                        </div>
                        <Badge variant="outline" className={`text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </Badge>
                      </div>
                      <CardTitle className="font-display text-base font-bold pt-1">
                        {ticket.subject}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Opened on {new Date(ticket.created_at).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      {/* User's Original Message */}
                      <div className="rounded-2xl bg-muted/40 p-4 space-y-1 text-sm border border-border/30">
                        <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <span>Your Inquiry:</span>
                        </div>
                        <p className="whitespace-pre-wrap text-foreground/90">{ticket.message}</p>
                      </div>

                      {/* Official Agent Reply */}
                      {isAnswered && ticket.admin_reply ? (
                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 space-y-2 text-sm shadow-xs">
                          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                            <span className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                              <ShieldCheck className="size-4" />
                              Official Agent Response
                            </span>
                            {ticket.replied_at ? (
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(ticket.replied_at).toLocaleTimeString("en-ZA", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : null}
                          </div>
                          <p className="whitespace-pre-wrap text-foreground font-medium leading-relaxed">
                            {ticket.admin_reply}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
                          <Clock className="size-4 shrink-0" />
                          <span>
                            Ticket currently assigned to the South Africa review desk. You will receive an official response here shortly.
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
