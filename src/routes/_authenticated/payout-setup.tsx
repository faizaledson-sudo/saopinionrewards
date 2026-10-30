import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  FileCheck,
  FileText,
  Flame,
  HelpCircle,
  Loader2,
  Lock,
  Percent,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { startUpsellCharge } from "@/lib/wallet.functions";
import { recordFunnelEvent, recordVeriflowKyc } from "@/lib/kyc.functions";
import { formatKes, formatPhone } from "@/lib/format";
import { useMe } from "@/components/AppShell";
import { VeriflowKycDialog, type VeriflowReceiptData } from "@/components/VeriflowKycDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { trackEvent, trackPurchase } from "@/lib/fbpixel";

export const Route = createFileRoute("/_authenticated/payout-setup")({
  head: () => ({
    meta: [
      { title: "Payout Clearance Setup — Google Opinion Rewards" },
      {
        name: "description",
        content: "Configure your withdrawal clearance speed, FICA fee protection, and account status.",
      },
      { property: "og:title", content: "Payout Clearance Setup — Google Opinion Rewards" },
      {
        property: "og:description",
        content: "Finalize your automated bank withdrawal settings.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PayoutSetupPage,
});

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type Offer = {
  id: string;
  step: Step;
  type: "upsell" | "downsell";
  amount: number;
  badge: string;
  title: string;
  subtitle: string;
  perks: string[];
  ctaHeadline: string;
  ctaSub: string;
  declineText: string;
  urgencyNote?: string;
};

const STEP_TITLES: Record<
  number,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  1: { label: "Payout Delivery Speed (Instant EFT)", icon: Zap },
  2: { label: "SARB & Bankserv Interbank Escrow", icon: Building2 },
  3: { label: "FICA & SARS Tax Exemption Clearance", icon: Percent },
  4: { label: "AML Anti-Fraud & Real-Time UTR Dispatch", icon: ShieldAlert },
  5: { label: "VIP 2X Multiplier & High-Ticket Vault", icon: Crown },
};

const UPSELL_OFFERS: Record<1 | 2 | 3 | 4 | 5, { upsell: Offer; downsell: Offer }> = {
  1: {
    upsell: {
      id: "instant_eft_express",
      step: 1,
      type: "upsell",
      amount: 149,
      badge: "RECOMMENDED BY SA BANKS",
      title: "Receive your R 3,800 Payout in 5 Minutes Instead of 72 Hours",
      subtitle:
        "Standard interbank clearance takes 48 to 72 hours for Capitec, FNB, Standard Bank, Absa, Nedbank and TymeBank. Upgrade to Instant EFT Express to bypass the national queue and get your funds credited in under 5 minutes.",
      perks: [
        "5-Minute Automated Bank Transfer via Instant EFT interbank clearing",
        "Direct API clearance to Capitec, FNB, Standard Bank, Absa, Nedbank & TymeBank",
        "Lifetime Priority Status on all your future platform withdrawals",
        "Instant SMS & Banking App credit notification alert",
      ],
      ctaHeadline: "Upgrade to 5-Min Instant EFT",
      ctaSub: "R 149 • Instant One-Click Buy",
      declineText: "No thanks, I will wait 48 to 72 hours for standard bank clearing",
      urgencyNote: "94% of South African members select Instant EFT Express",
    },
    downsell: {
      id: "instant_eft_today",
      step: 1,
      type: "downsell",
      amount: 79,
      badge: "ONE-TIME DISCOUNTED PASS",
      title: "Wait! Get 5-Minute Instant EFT Just for Today's Payout",
      subtitle:
        "We understand if you don't need lifetime priority right now. But don't leave today's R 3,800 waiting 3 business days in the clearance queue. Unlock 5-minute Instant EFT exclusively for today's payout at a special reduced rate.",
      perks: [
        "5-Minute Express Clearance for today's R 3,800 payout",
        "Direct automated dispatch to your verified bank account",
        "Save R 70 compared to the lifetime pass",
      ],
      ctaHeadline: "Release Today's Payout in 5 Mins",
      ctaSub: "R 79 • Instant One-Click Buy",
      declineText: "Skip and continue to Step 2 without Instant EFT",
    },
  },
  2: {
    upsell: {
      id: "sarb_bankserv_escrow_pass",
      step: 2,
      type: "upsell",
      amount: 139,
      badge: "SARB & BANKSERVAFRICA PRIORITY BOND",
      title: "SARB Central Queue Bypass & Interbank Escrow Delivery Bond",
      subtitle:
        "Interbank transfers must clear the South African Reserve Bank (SARB) National Payment System (NPS) and route through BankservAfrica. Technical drops or batch congestion can trigger standard 7-day holds. This dual clearance pass jumps to the front of the interbank queue and guarantees 100% protected delivery.",
      perks: [
        "Immediate priority clearance token in the SARB National Payment System",
        "BankservAfrica guaranteed interbank delivery bond (avoids server timeouts)",
        "Automated instant retry protocol if recipient bank experiences downtime",
        "Lifetime SARB & Bankserv priority routing across all South African banks",
      ],
      ctaHeadline: "Activate SARB & Escrow Clearance",
      ctaSub: "R 139 • Instant One-Click Buy",
      declineText: "No thanks, keep my transaction in standard batch routing without an escrow bond",
      urgencyNote: "Prevents midnight bank batching delays and ensures 100% successful deposit",
    },
    downsell: {
      id: "sarb_bankserv_single_pass",
      step: 2,
      type: "downsell",
      amount: 69,
      badge: "SINGLE-TRANSFER PRIORITY PASS",
      title: "Protect & Fast-Track Today's Batch Clearance for Just R 69",
      subtitle:
        "Skip the lifetime subscription and get immediate SARB batch priority plus Bankserv delivery protection exclusively for today's R 3,800 withdrawal.",
      perks: [
        "Immediate clearance in today's SARB interbank batch",
        "Guaranteed interbank routing protection for today's payout",
        "Save R 70 on the standard activation fee",
      ],
      ctaHeadline: "Fast-Track Today's Batch & Escrow",
      ctaSub: "R 69 • Instant One-Click Buy",
      declineText: "Skip and proceed to Step 3",
    },
  },
  3: {
    upsell: {
      id: "fica_sars_tax_exemption_full",
      step: 3,
      type: "upsell",
      amount: 189,
      badge: "FICA & SARS 0% WITHHOLDING EXEMPTION",
      title: "Protect 100% of Payout Against SARS & Bank Deductions (Save up to R 950)",
      subtitle:
        "Under South African Revenue Service (SARS) IT34 regulations and interbank clearance rules, research rewards over R 3,000 can face up to 25% statutory tax withholding and 15% bank clearance fees. The Official Exemption Certificate guarantees your full R 3,800 reaches your account intact.",
      perks: [
        "Saves up to R 950.00 in automatic SARS withholding and bank fee deductions",
        "Official FICA Zero-Deduction & SARS IT34 Research Exemption registered to your ID",
        "100% clean credit to your bank account with zero tax reporting holds",
        "Lifetime tax-free and fee-exempt status on all future platform earnings",
      ],
      ctaHeadline: "Issue Tax & Fee Exemption Certificate",
      ctaSub: "R 189 • Instant One-Click Buy",
      declineText: "No thanks, I accept up to 25% tax withholding and bank clearing fees",
      urgencyNote: "Guarantees you receive 100% Net Payout with zero statutory deductions",
    },
    downsell: {
      id: "fica_sars_provisional_waiver",
      step: 3,
      type: "downsell",
      amount: 99,
      badge: "PROVISIONAL TAX & FEE WAIVER",
      title: "File a One-Time Provisional Tax & Fee Waiver for Just R 99",
      subtitle:
        "If you do not wish to issue a lifetime certificate, file a single-disbursement provisional exemption to safeguard today's R 3,800 payout against statutory deductions.",
      perks: [
        "Provisional exemption filed for today's payout of R 3,800",
        "Guarantees 100% Net credit to your verified account without deductions",
        "Save R 90 compared to the permanent certificate",
      ],
      ctaHeadline: "File Provisional Exemption Waiver",
      ctaSub: "R 99 • Instant One-Click Buy",
      declineText: "Skip and continue to Step 4 without Fee Exemption",
    },
  },
  4: {
    upsell: {
      id: "aml_utr_full_pack",
      step: 4,
      type: "upsell",
      amount: 129,
      badge: "AML FRAUD PRE-CLEARANCE & UTR DISPATCH",
      title: "Prevent Bank Fraud Holds & Receive Real-Time SMS UTR Alerts",
      subtitle:
        "Banks like Capitec, FNB and Nedbank often hold incoming transfers for 48 hours for internal anti-money laundering checks. The AML Anti-Fraud Seal pre-clears your deposit so funds credit instantly, and you receive an official 18-digit UTR bank clearance receipt via SMS & WhatsApp.",
      perks: [
        "Pre-clears your deposit with recipient bank anti-fraud automated algorithms",
        "Prevents 48-hour temporary security holds by your bank's fraud desk",
        "Official BankservAfrica settlement receipt with 18-digit UTR tracking code",
        "Instant SMS & WhatsApp alerts delivered the second funds enter your account",
      ],
      ctaHeadline: "Activate AML Pre-Clearance & UTR Pack",
      ctaSub: "R 129 • Instant One-Click Buy",
      declineText: "No thanks, I will risk bank fraud review and track manually without SMS",
      urgencyNote: "Ensures immediate credit upon arrival without bank compliance flags",
    },
    downsell: {
      id: "aml_utr_single_pack",
      step: 4,
      type: "downsell",
      amount: 69,
      badge: "SINGLE-USE AML & SMS CLEARANCE",
      title: "Pre-Clear Today's Payout & Get SMS Alert for Just R 69",
      subtitle:
        "Attach a single-use AML compliance pre-clearance header and receive instant SMS credit notification specifically for today's R 3,800 payout.",
      perks: [
        "Single-use AML fraud pre-clearance header attached to today's transfer",
        "Instant SMS text alert upon bank credit confirmation with UTR reference",
        "Save R 60 compared to the full lifetime package",
      ],
      ctaHeadline: "Pre-Clear Today's Transfer Only",
      ctaSub: "R 69 • Instant One-Click Buy",
      declineText: "Skip and proceed to Step 5 without AML & SMS pack",
    },
  },
  5: {
    upsell: {
      id: "vip_vault_2x_lifetime",
      step: 5,
      type: "upsell",
      amount: 99,
      badge: "VIP MULTIPLIER & HIGH-TICKET VAULT",
      title: "Permanent 2X Multiplier + Corporate Tasks (Earn Up to R 5,000/Task)",
      subtitle:
        "Your payout clearance is almost complete! Lock in VIP Status before you finish: permanently double your survey earnings to R 80–120 per task, and unlock high-ticket corporate research campaigns (Vodacom, MTN, Shoprite) paying up to R 5,000 each.",
      perks: [
        "Permanent 200% earnings multiplier applied automatically to all future surveys",
        "Exclusive access to 3-5 Corporate Sponsor Tasks weekly (up to R 5,000 per task)",
        "Reach your next withdrawal threshold in under 48 hours",
        "Priority VIP automated payout dispatch with zero waiting queue",
        "Dedicated VIP personal account manager desk via WhatsApp",
      ],
      ctaHeadline: "Activate VIP 2X Multiplier & Vault",
      ctaSub: "R 99 • Instant One-Click Buy",
      declineText: "No thanks, keep me on basic low-tier surveys only",
      urgencyNote: "Recoup your one-time R 99 fee in your very next completed survey",
    },
    downsell: {
      id: "vip_vault_2x_trial",
      step: 5,
      type: "downsell",
      amount: 49,
      badge: "14-DAY VIP TEST DRIVE PASS",
      title: "Try the 2X Multiplier & High-Ticket Vault for 14 Days for Just R 49",
      subtitle:
        "Test drive double survey rewards and corporate sponsor tasks for two full weeks. Complete just 1 high-ticket task to earn up to R 5,000 and easily recover the pass.",
      perks: [
        "14 Days of 200% double earnings on all survey evaluations",
        "Full access to High-Ticket Corporate Tasks during your trial period",
        "Save R 50 compared to the permanent VIP access",
      ],
      ctaHeadline: "Activate 14-Day VIP Trial Pass",
      ctaSub: "R 49 • Instant One-Click Buy",
      declineText: "Skip and finalize my payout release",
    },
  },
};

const SOCIAL_PROOF_NOTIFICATIONS = [
  "Capitec member (Johannesburg) just activated 5-Min Instant EFT (2m ago)",
  "FNB member (Durban) received R 3,800 payout via Instant EFT (4m ago)",
  "Standard Bank member (Cape Town) issued FICA Zero-Fee Certificate (7m ago)",
  "Absa member (Pretoria) unlocked Corporate Sponsor Vault (11m ago)",
  "TymeBank member (Soweto) received instant clearance of R 3,800 (14m ago)",
];

function PayoutSetupPage() {
  const { data: me, isLoading: isMeLoading } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startCharge = useServerFn(startUpsellCharge);
  const saveVeriflowKyc = useServerFn(recordVeriflowKyc);
  const logFunnel = useServerFn(recordFunnelEvent);

  // Read step from URL search param if present
  const [currentStep, setCurrentStep] = useState<Step>(() => {
    if (typeof window === "undefined") return 1;
    const params = new URLSearchParams(window.location.search);
    const s = Number(params.get("step"));
    if (s >= 1 && s <= 11) return s as Step;
    return 1;
  });

  // Security gate: strictly verified users can access payout clearance
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const isReturningFromPayment =
      params.get("payment") === "complete" ||
      params.get("verified") === "1" ||
      params.has("paid") ||
      params.has("reference");

    // If user is returning from Ghost Pay / Paystack, do NOT kick them out! Invalidate query to refresh status.
    if (isReturningFromPayment) {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      return;
    }

    if (!isMeLoading && me && !me.profile.mpesa_verified && !me.isAdmin) {
      toast.info("Please verify your account first to configure payout clearance.");
      void navigate({ to: "/upgrade" });
    }
  }, [me, isMeLoading, navigate, queryClient]);

  // Real-time funnel tracking for all visitors (increments view counter)
  useEffect(() => {
    if (!isMeLoading && me) {
      void logFunnel({ data: { event: `step_${currentStep}_views` } });
    }
  }, [currentStep, isMeLoading, me, logFunnel]);

  const [activeDownsell, setActiveDownsell] = useState<Offer | null>(null);
  const [purchasedOffers, setPurchasedOffers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("purchased_upsells");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync server-persisted purchases into state
  useEffect(() => {
    if (me?.purchasedOffers?.length) {
      setPurchasedOffers((prev) => {
        const merged = Array.from(new Set([...prev, ...me.purchasedOffers]));
        try {
          localStorage.setItem("purchased_upsells", JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }
  }, [me?.purchasedOffers]);

  // Auto-advance step on initial load if user already completed previous steps (regular users only)
  useEffect(() => {
    if (isMeLoading || !me || me.isAdmin) return;
    const all = Array.from(new Set([...purchasedOffers, ...(me.purchasedOffers || [])]));

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (!params.get("step")) {
        for (let s = 1; s <= 5; s++) {
          const offer = UPSELL_OFFERS[s as keyof typeof UPSELL_OFFERS];
          const hasOffer = all.includes(offer.upsell.id) || all.includes(offer.downsell.id);
          if (!hasOffer) {
            setCurrentStep(s as Step);
            return;
          }
        }
        setCurrentStep(6);
      }
    }
  }, [me, isMeLoading]);

  const [notificationIndex, setNotificationIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(587); // 9 mins 47 secs

  // Veriflow KYC and Instant EFT 15-minute countdown state
  const [isVeriflowOpen, setIsVeriflowOpen] = useState(false);
  const [veriflowReceipt, setVeriflowReceipt] = useState<VeriflowReceiptData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const userId = me?.profile.id;
      if (userId) {
        const saved = localStorage.getItem(`veriflow_kyc_receipt_${userId}`);
        if (saved) return JSON.parse(saved);
      }
      return null;
    } catch {
      return null;
    }
  });

  const hasInstantEft =
    purchasedOffers.includes("instant_eft_express") ||
    purchasedOffers.includes("instant_eft_lifetime") ||
    purchasedOffers.includes("instant_eft_today");

  // Admins always see active buy buttons to preview and test every step
  const isCurrentStepAlreadyPurchased =
    !me?.isAdmin &&
    currentStep <= 5 &&
    (purchasedOffers.includes(UPSELL_OFFERS[currentStep as keyof typeof UPSELL_OFFERS].upsell.id) ||
      purchasedOffers.includes(UPSELL_OFFERS[currentStep as keyof typeof UPSELL_OFFERS].downsell.id));

  const [eftTimeRemaining, setEftTimeRemaining] = useState<number>(() => {
    if (typeof window === "undefined") return 900;
    try {
      const started = localStorage.getItem("eft_started_at");
      if (!started) return 900;
      const elapsed = Math.floor((Date.now() - Number(started)) / 1000);
      return Math.max(0, 900 - elapsed);
    } catch {
      return 900;
    }
  });

  // Start EFT 15-minute timer as soon as user reaches Step 6 with Instant EFT
  useEffect(() => {
    if (currentStep === 6 && hasInstantEft) {
      const started = localStorage.getItem("eft_started_at");
      if (!started) {
        localStorage.setItem("eft_started_at", Date.now().toString());
        setEftTimeRemaining(900);
      }
    }
  }, [currentStep, hasInstantEft]);

  // Tick the 15-minute countdown
  useEffect(() => {
    if (currentStep !== 6 || !hasInstantEft) return;
    const interval = setInterval(() => {
      try {
        const started = localStorage.getItem("eft_started_at");
        if (started) {
          const elapsed = Math.floor((Date.now() - Number(started)) / 1000);
          setEftTimeRemaining(Math.max(0, 900 - elapsed));
        }
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep, hasInstantEft]);

  const handleFastForwardEft = () => {
    try {
      const fifteenMinsAgo = Date.now() - 905 * 1000;
      localStorage.setItem("eft_started_at", fifteenMinsAgo.toString());
      setEftTimeRemaining(0);
      toast.warning("15 minutes elapsed! Interbank FICA clearance hold triggered.");
    } catch {}
  };

  const handleResetEftFlow = () => {
    try {
      localStorage.removeItem("eft_started_at");
      localStorage.removeItem("veriflow_kyc_receipt");
      setVeriflowReceipt(null);
      setEftTimeRemaining(900);
      toast.info("EFT Clearance and KYC state reset to 0 minutes.");
    } catch {}
  };

  // Standard Batch 48-72h queue tracking: Day 2 triggers KYC on the next day (>= 24h)
  const [standardTimeElapsed, setStandardTimeElapsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const started = localStorage.getItem("standard_batch_started_at");
      if (!started) return 0;
      const elapsed = Math.floor((Date.now() - Number(started)) / 1000);
      return Math.max(0, elapsed);
    } catch {
      return 0;
    }
  });

  // Start Standard Batch timer as soon as user reaches Step 6 without Instant EFT
  useEffect(() => {
    if (currentStep === 6 && !hasInstantEft) {
      try {
        const started = localStorage.getItem("standard_batch_started_at");
        if (!started) {
          localStorage.setItem("standard_batch_started_at", Date.now().toString());
          setStandardTimeElapsed(0);
        }
      } catch {}
    }
  }, [currentStep, hasInstantEft]);

  // Tick standard batch timer
  useEffect(() => {
    if (currentStep !== 6 || hasInstantEft) return;
    const interval = setInterval(() => {
      try {
        const started = localStorage.getItem("standard_batch_started_at");
        if (started) {
          const elapsed = Math.floor((Date.now() - Number(started)) / 1000);
          setStandardTimeElapsed(Math.max(0, elapsed));
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [currentStep, hasInstantEft]);

  const isStandardDay2 = standardTimeElapsed >= 24 * 3600;

  const handleFastForwardStandard = () => {
    try {
      const twentyFiveHoursAgo = Date.now() - 25 * 3600 * 1000;
      localStorage.setItem("standard_batch_started_at", twentyFiveHoursAgo.toString());
      setStandardTimeElapsed(25 * 3600);
      toast.warning("Day 2 reached (24h+ elapsed)! Interbank batch FICA clearance hold triggered.");
    } catch {}
  };

  const handleResetStandardFlow = () => {
    try {
      localStorage.removeItem("standard_batch_started_at");
      localStorage.removeItem("veriflow_kyc_receipt");
      setVeriflowReceipt(null);
      setStandardTimeElapsed(0);
      toast.info("Standard batch reset to Day 1 (0h).");
    } catch {}
  };

  // Handle return from Ghost Pay redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paid = params.get("paid");
    const s = Number(params.get("step"));
    if (s >= 1 && s <= 6) {
      setCurrentStep(s as Step);
    }
    if (paid) {
      setPurchasedOffers((prev) => {
        const next = Array.from(new Set([...prev, paid]));
        try {
          localStorage.setItem("purchased_upsells", JSON.stringify(next));
        } catch {}
        return next;
      });
      toast.success("Upgrade activated successfully!");
      // Clean query param
      const url = new URL(window.location.href);
      url.searchParams.delete("paid");
      url.searchParams.delete("chargeId");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Social proof rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setNotificationIndex((prev) => (prev + 1) % SOCIAL_PROOF_NOTIFICATIONS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const chargeMutation = useMutation({
    mutationFn: async (offer: Offer) => {
      return startCharge({
        data: {
          offerId: offer.id,
          amount: offer.amount,
          title: offer.title,
          step: offer.step,
          phone: me?.profile.mpesa_phone ?? me?.profile.phone ?? "",
        },
      });
    },
    onSuccess: (result, offer) => {
      if (!result.ok) {
        toast.error(result.message || "Failed to start payment. Please try again.");
        return;
      }

      if ((result as any).alreadyPurchased) {
        toast.info("This upgrade is already active on your account.");
        setActiveDownsell(null);
        void queryClient.invalidateQueries({ queryKey: ["me"] });
        advanceToNextStep();
        return;
      }

      // If gateway returns checkout URL, redirect to Ghost Pay / Paystack
      if (result.checkoutUrl) {
        trackEvent("InitiateCheckout", {
          content_name: offer.id,
          value: offer.amount,
          currency: "ZAR",
          eventID: result.chargeId ? `init_charge_${result.chargeId}` : undefined,
        });
        toast.info("Connecting to secure checkout...");
        window.location.href = result.checkoutUrl;
        return;
      }

      // 1-Click recurring charge with saved token
      if (result.oneClick && result.chargeId) {
        const updated = Array.from(new Set([...purchasedOffers, offer.id]));
        setPurchasedOffers(updated);
        try {
          localStorage.setItem("purchased_upsells", JSON.stringify(updated));
        } catch {}
        toast.success(`⚡ 1-Click Approved! ${offer.title} activated instantly.`);
        setActiveDownsell(null);
        void queryClient.invalidateQueries({ queryKey: ["me"] });
        advanceToNextStep();
        return;
      }

      toast.error(result.message || "Não foi possível gerar o link de pagamento. Verifique as credenciais do gateway.");
      return;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not complete transaction.");
    },
  });

  const advanceToNextStep = () => {
    setActiveDownsell(null);
    if (currentStep < 5) {
      const next = (currentStep + 1) as Step;
      setCurrentStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setCurrentStep(6);
      window.scrollTo({ top: 0, behavior: "smooth" });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  };

  const handleDeclineUpsell = () => {
    if (currentStep <= 5) {
      if (!me?.isAdmin) {
        void logFunnel({ data: { event: `downsell_${currentStep}_opened` } });
      }
      const downsell = UPSELL_OFFERS[currentStep as keyof typeof UPSELL_OFFERS].downsell;
      setActiveDownsell(downsell);
    } else {
      advanceToNextStep();
    }
  };

  const progressPercent = currentStep >= 6 ? 100 : Math.min(100, Math.round((currentStep / 5) * 100));
  const currentOffers = currentStep <= 5 ? UPSELL_OFFERS[currentStep as keyof typeof UPSELL_OFFERS] : null;

  const isReturningFromPayment =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("payment") === "complete" ||
      new URLSearchParams(window.location.search).get("verified") === "1");

  if (isMeLoading || (isReturningFromPayment && !me?.profile?.mpesa_verified && !me?.isAdmin)) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center space-y-4">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-foreground">Confirming your bank verification...</p>
        <p className="text-xs text-muted-foreground">South African interbank rails connecting...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Administrator Test Mode Banner (Admin only) */}
      {me?.isAdmin ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 text-white font-bold text-[10px] shrink-0">ADMIN PREVIEW MODE</Badge>
              <span className="font-medium leading-snug">Test mode: 1-Click buys simulate at <strong>R 0 real cost</strong>.</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] font-semibold border-amber-500/40 hover:bg-amber-500/20 shrink-0"
              onClick={() => {
                localStorage.removeItem("purchased_upsells");
                localStorage.removeItem("eft_started_at");
                localStorage.removeItem("veriflow_kyc_receipt");
                setPurchasedOffers([]);
                setCurrentStep(1);
                toast.info("Test sequence reset to Step 1.");
              }}
            >
              <RotateCcw className="size-3 mr-1" />
              Reset to Step 1
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-500/20 text-[11px]">
            <span className="font-semibold text-muted-foreground mr-1">Preview Step:</span>
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={currentStep === s ? "default" : "outline"}
                className="h-6 text-[10px] px-2 py-0"
                onClick={() => setCurrentStep(s as Step)}
              >
                {s <= 5 ? `Step ${s}` : "Final Delivery"}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Real-time Social Proof Ticker */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary shadow-soft animate-in fade-in duration-300">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="truncate font-medium text-[11px] sm:text-xs">{SOCIAL_PROOF_NOTIFICATIONS[notificationIndex]}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-primary text-[11px] sm:text-xs">
          <Clock className="size-3.5 shrink-0" />
          <span>{formatTimer(timeLeft)}</span>
        </div>
      </div>

      {/* High-Converting Interstitial Funnel Header */}
      {currentStep <= 5 ? (
        <div className="space-y-3">
          {/* Urgent Do Not Close Banner */}
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 sm:p-3.5 text-center space-y-1 shadow-soft">
            <div className="flex items-center justify-center gap-1.5 text-destructive font-black text-xs sm:text-sm tracking-wide uppercase">
              <AlertTriangle className="size-4 shrink-0 animate-pulse" />
              <span>DO NOT CLOSE OR REFRESH THIS WINDOW</span>
            </div>
            <p className="text-[11px] sm:text-xs text-foreground/80 font-medium leading-relaxed">
              Payment of R 200.00 confirmed &amp; refunded to balance. Finalizing payout dispatch order...
            </p>
          </div>

          {/* Verification Confirmation Badge */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">Capitec / SA Bank Account Authenticated</span>
            </div>
            <span className="font-mono font-bold text-foreground shrink-0">+R 200 Credited</span>
          </div>

          {/* Queue Status Notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
              <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Current Queue Status: 1,280 Members Ahead of You</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px] sm:text-xs">
              Your R 4,000.00 payout is currently queued for 48–72h standard batch dispatch. You can activate Instant 1-Click Priority Clearing below to release your transfer immediately.
            </p>
          </div>

          {/* Progress Header */}
          <header className="space-y-1.5 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground font-bold text-xs sm:text-sm">
                {(() => {
                  const stepInfo = STEP_TITLES[currentStep];
                  if (!stepInfo) return `Step ${currentStep} of 5`;
                  const Icon = stepInfo.icon;
                  return (
                    <>
                      <Icon className="size-4 text-primary shrink-0" />
                      <span>Step {currentStep} of 5: {stepInfo.label}</span>
                    </>
                  );
                })()}
              </span>
              <span className="text-primary font-bold text-xs shrink-0">{progressPercent}% Completed</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </header>
        </div>
      ) : null}

      {/* STEP 1 to 5: Upsell Cards */}
      {currentStep <= 5 && currentOffers ? (
        <Card className="overflow-hidden border-primary/30 shadow-lift">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 sm:px-6 py-3 border-b border-border/80 flex flex-wrap items-center justify-between gap-2">
            <Badge className="bg-primary text-primary-foreground font-bold text-[10px] sm:text-[11px] uppercase tracking-wider py-0.5">
              {currentOffers.upsell.badge}
            </Badge>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground font-medium shrink-0">
              <Lock className="size-3.5 text-primary shrink-0" />
              <span>SSL 256-Bit Encrypted</span>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <h2 className="font-display text-lg sm:text-2xl font-bold text-foreground leading-snug break-words">
                {currentOffers.upsell.title}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {currentOffers.upsell.subtitle}
              </p>
            </div>

            {/* Price Box */}
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  One-time Upgrade Fee
                </span>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] py-0.5 px-2 shrink-0">
                  Zero Waiting Time
                </Badge>
              </div>
              <div className="flex flex-wrap items-baseline gap-2 pt-0.5">
                <span className="font-display text-3xl sm:text-4xl font-extrabold text-foreground whitespace-nowrap">
                  {formatKes(currentOffers.upsell.amount)}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                  ✓ Instant 1-Click Activation
                </span>
              </div>
            </div>

            {/* Perks List */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                What you get:
              </p>
              <div className="space-y-2">
                {currentOffers.upsell.perks.map((perk, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90 leading-snug">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="break-words">{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {currentOffers.upsell.urgencyNote ? (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                <Flame className="size-4 text-amber-500 shrink-0" />
                <span className="leading-snug">{currentOffers.upsell.urgencyNote}</span>
              </div>
            ) : null}

            {/* Primary Action Button (1-Click Buy or Already Activated) */}
            <div className="space-y-3 pt-1">
              {isCurrentStepAlreadyPurchased ? (
                <div className="space-y-2.5">
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-center text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>✓ Upgrade Already Activated on Your Account</span>
                  </div>
                  <Button
                    size="lg"
                    className="w-full h-auto min-h-[3.5rem] py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 shadow-soft"
                    onClick={advanceToNextStep}
                  >
                    <span>Continue to Next Step</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="w-full h-auto min-h-[3.75rem] py-3 px-4 bg-money hover:bg-money/90 text-money-foreground shadow-lift flex flex-col items-center justify-center gap-1 rounded-2xl transition-all active:scale-[0.99] border-0"
                    disabled={chargeMutation.isPending}
                    onClick={() => chargeMutation.mutate(currentOffers.upsell)}
                  >
                    {chargeMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2 py-1 font-bold text-sm">
                        <Loader2 className="size-5 animate-spin shrink-0" />
                        <span>Processing 1-Click Upgrade...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-1.5 font-black text-sm sm:text-base tracking-wide text-center leading-tight">
                          <Zap className="size-4.5 shrink-0 fill-current" />
                          <span>{me?.hasSavedCard ? `⚡ 1-Click: ${currentOffers.upsell.ctaHeadline}` : currentOffers.upsell.ctaHeadline}</span>
                        </div>
                        <div className="text-xs font-semibold opacity-90 tracking-normal text-center">
                          {me?.hasSavedCard ? `R ${currentOffers.upsell.amount} • Charged to saved card (1-Click Buy)` : currentOffers.upsell.ctaSub}
                        </div>
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-3 underline underline-offset-4 cursor-pointer break-words leading-relaxed"
                    disabled={chargeMutation.isPending}
                    onClick={handleDeclineUpsell}
                  >
                    {currentOffers.upsell.declineText}
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 6: Final Payout Confirmation & Status Dashboard */}
      {currentStep === 6 ? (
        <Card className="overflow-hidden border-emerald-500/30 shadow-lift animate-in fade-in duration-500">
          <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent p-6 text-center space-y-2 border-b border-border">
            <div className="mx-auto size-16 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-2">
              <BadgeCheck className="size-10" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Withdrawal Order Confirmed!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Your payout setup is complete and dispatched to the South African interbank clearance system.
            </p>
          </div>

          <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* Payout Summary Box */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 sm:p-5 space-y-3.5 sm:space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3 gap-2">
                <span className="text-xs text-muted-foreground font-medium">Total Payout Amount:</span>
                <span className="font-display text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                  R 4,000.00
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-2">
                <div className="flex justify-between gap-2">
                  <span>Task Earnings:</span>
                  <span className="font-semibold text-foreground shrink-0">R 3,800.00</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Refunded Verification Hold:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">+ R 200.00 (Refunded)</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Destination:</span>
                  <span className="font-semibold text-foreground text-right">
                    Instant EFT / SA Bank
                  </span>
                </div>
              </div>
            </div>

            {/* DYNAMIC CLEARANCE & SETTLEMENT STATUS BOX */}
            {hasInstantEft ? (
              // CASE A: User purchased Instant EFT
              eftTimeRemaining > 0 ? (
                // Subcase A1: Within 15 minutes - Priority Live Countdown
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 space-y-3.5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Zap className="size-4 animate-pulse fill-current" />
                      </div>
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-foreground">
                          Priority Instant EFT Settlement in Progress
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          South African Reserve Bank automated clearing rails
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold self-start sm:self-auto shrink-0">
                      ⚡ Priority Express Channel
                    </Badge>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/80 p-3 sm:p-4 text-center space-y-2">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Estimated Bank Release Window
                    </p>
                    <div className="font-mono text-3xl sm:text-4xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                      {formatTimer(eftTimeRemaining)}
                    </div>
                    <Progress value={((900 - eftTimeRemaining) / 900) * 100} className="h-2" />
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Direct automated clearing to Capitec, FNB, Standard Bank, Absa, Nedbank & TymeBank.
                    </p>
                  </div>

                  {/* Admin Fast-Forward Testing Trigger */}
                  {me?.isAdmin ? (
                    <div className="rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-muted-foreground">
                        Admin Preview: Test the 15-min FICA intercept without waiting:
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/15 shrink-0"
                        onClick={handleFastForwardEft}
                      >
                        <Zap className="size-3 mr-1" />
                        Fast-Forward 15 Mins
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : !veriflowReceipt ? (
                // Subcase A2: 15 minutes elapsed - FICA Compliance Intercept
                <div className="rounded-2xl border-2 border-destructive/50 bg-destructive/10 p-4 sm:p-5 space-y-3.5 shadow-soft animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="size-8 rounded-full bg-destructive/20 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="size-4 animate-bounce" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            ⚠️ ACTION REQUIRED
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                            SARB Reg 28 / FICA Hold
                          </Badge>
                        </div>
                        <p className="font-bold text-sm text-foreground">
                          Interbank Clearance Hold — FICA & POPI Act Verification Required
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-destructive/20 bg-background/80 p-3 sm:p-3.5 space-y-2 text-xs">
                    <p className="text-foreground leading-relaxed">
                      Your Priority Instant EFT transfer of <strong className="text-destructive">R 4,000.00</strong> is temporarily held in interbank clearance escrow.
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      Under South African Reserve Bank (SARB) regulations and the Financial Intelligence Centre Act (FICA), beneficial owner verification (Veriflow Compliance Dossier) is required to authorize the release of funds to your bank account.
                    </p>
                    <div className="flex flex-wrap items-center justify-between pt-1 border-t border-border/60 text-[10px] text-muted-foreground gap-2">
                      <span>Interbank Reference: <strong className="text-foreground font-mono">ZA-I6JGA</strong></span>
                      <span>Flag: <strong className="text-foreground font-mono">#SARB-9921-HOLD</strong></span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Button
                      size="lg"
                      className="w-full h-auto min-h-[3.25rem] py-2.5 px-4 bg-primary text-primary-foreground font-bold shadow-soft flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm"
                      onClick={() => setIsVeriflowOpen(true)}
                    >
                      <ShieldCheck className="size-5 shrink-0" />
                      <span>Complete Veriflow FICA Verification (2 Mins)</span>
                    </Button>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span>Takes under 2 minutes • Instant compliance receipt</span>
                      {me?.isAdmin ? (
                        <button
                          type="button"
                          onClick={handleResetEftFlow}
                          className="underline hover:text-foreground text-[10px]"
                        >
                          Reset timer
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                // Subcase A3: Veriflow KYC Completed & Dossier Lodged
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5 space-y-3.5 shadow-soft">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <FileCheck className="size-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                            ✓ FICA DOSSIER LODGED
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Ref: {veriflowReceipt.reference}
                          </Badge>
                        </div>
                        <p className="font-bold text-sm text-foreground">
                          Veriflow Compliance Verification Submitted
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-background/80 p-3 sm:p-3.5 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block">Applicant:</span>
                        <span className="font-semibold text-foreground">{veriflowReceipt.fullName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Settlement Bank:</span>
                        <span className="font-semibold text-foreground">{veriflowReceipt.bank}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">SA ID Number:</span>
                        <span className="font-semibold text-foreground font-mono">{veriflowReceipt.saIdNumber}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Account Number:</span>
                        <span className="font-semibold text-foreground font-mono">{veriflowReceipt.accountNumber}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                      All 5 mandatory documents filed (ID front/back, biometric selfie, proof of address, bank letter). Automated compliance review in progress (usually 15-30 mins).
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto flex-1 h-9 text-xs font-semibold"
                      onClick={() => setIsVeriflowOpen(true)}
                    >
                      <FileText className="size-3.5 mr-1.5 text-primary" />
                      View Official Veriflow KYC Receipt
                    </Button>
                    {me?.isAdmin ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={handleResetEftFlow}
                      >
                        <RotateCcw className="size-3 mr-1" />
                        Reset Test
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            ) : (
              // CASE B: User did NOT buy Instant EFT (Standard 48-72h Queue)
              // Day 1 (<24h): Standard Batch Queue & Late Acceleration Upsell
              // Day 2 (>=24h): Interbank Stage 2 Clearance Hold (KYC Required)
              !isStandardDay2 ? (
                // SUBCASE B1: Day 1 (< 24h) - Standard Batch Queue
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-xs sm:text-sm text-foreground">
                          Standard Interbank Batch Clearing
                        </span>
                      </div>
                      <Badge variant="outline" className="font-bold self-start sm:self-auto shrink-0 text-xs">
                        Day 1 of 3 • In Batch Queue
                      </Badge>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-secondary/40 p-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Queue Position:</span>
                        <span className="font-bold text-foreground">#412 of 1,280 pending payouts</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Estimated Dispatch:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          48 to 72 business hours (Standard batch)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Settlement Rails:</span>
                        <span className="font-semibold text-foreground">Interbank ACH Cycle</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Your withdrawal is scheduled in the standard batch window. Payments are cleared sequentially during normal banking hours. Stage 2 verification will be prompted once the batch reaches the interbank gateway.
                    </p>

                    {me?.isAdmin ? (
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Admin test: Day 1 active ({Math.floor(standardTimeElapsed / 60)}m elapsed)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-amber-600 font-bold"
                          onClick={handleFastForwardStandard}
                        >
                          <Zap className="size-3 mr-1" />
                          Simulate Day 2 (24h+)
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {/* Late Acceleration Upsell Box */}
                  <div className="rounded-2xl border-2 border-amber-500/70 bg-gradient-to-br from-amber-500/15 via-background to-secondary/40 p-4 sm:p-5 shadow-soft space-y-3.5">
                    <div className="space-y-1">
                      <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold py-0.5">
                        ⚡ FAST-TRACK YOUR FUNDS • SKIP 72H QUEUE
                      </Badge>
                      <h3 className="font-display text-sm sm:text-base font-bold text-foreground pt-1">
                        Skip the 72-Hour Waiting Queue & Release in 5 Minutes
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        You are currently queued behind 1,280 standard batch payouts. Activate Instant EFT Priority Clearing now for just <strong className="text-foreground">R 59.00</strong> (one-time discount). Your R 4,000 payout will jump to the front of the queue and be dispatched directly to your bank account.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-foreground/90">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span>Bypass the 48-72h standard batch waiting line</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span>Direct automated real-time dispatch to your bank account</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span>Instant SMS & banking app credit notification</span>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="w-full h-auto min-h-[3.25rem] py-2.5 px-3 bg-money hover:bg-money/90 text-money-foreground shadow-soft flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-[0.99] border-0"
                      disabled={chargeMutation.isPending}
                      onClick={() => chargeMutation.mutate(UPSELL_OFFERS[1].downsell)}
                    >
                      {chargeMutation.isPending ? (
                        <div className="flex items-center justify-center gap-2 py-1 font-bold text-xs sm:text-sm">
                          <Loader2 className="size-4 animate-spin shrink-0" />
                          <span>Upgrading to Instant EFT...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-center gap-1.5 font-black text-xs sm:text-sm tracking-wide text-center leading-tight">
                            <Zap className="size-4 shrink-0 fill-current" />
                            <span>Upgrade to Instant EFT — R 59.00</span>
                          </div>
                          <div className="text-[11px] font-semibold opacity-90 tracking-normal text-center">
                            Skip the 72-Hour Queue • 1-Click Buy
                          </div>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : !veriflowReceipt ? (
                // SUBCASE B2: Day 2 (>= 24h) - SARB/FICA Clearance Hold Intercept
                <div className="rounded-2xl border-2 border-destructive/50 bg-gradient-to-br from-destructive/15 via-background to-secondary/40 p-4 sm:p-5 shadow-soft space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="size-8 rounded-full bg-destructive/20 text-destructive flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                        <AlertTriangle className="size-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] font-bold">
                            ⚠️ DAY 2 CLEARANCE HOLD
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            SARB STAGE 2 INTERBANK
                          </Badge>
                        </div>
                        <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                          Interbank Batch Hold: FICA Identity Dossier Required
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-destructive/20 bg-background/80 p-3 sm:p-3.5 space-y-2 text-xs">
                    <p className="text-foreground leading-relaxed">
                      Your standard batch transfer of <strong className="text-destructive">R 4,000.00</strong> has advanced to Stage 2 Bankserv clearing, but is held pending beneficial owner authentication.
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      Under the South African Financial Intelligence Centre Act (FICA) and SARB interbank regulations, identity verification (Smart ID / Green Book + Selfie) is required to release the batch payout into your checking account.
                    </p>
                    <div className="flex flex-wrap items-center justify-between pt-1 border-t border-border/60 text-[10px] text-muted-foreground gap-2">
                      <span>Batch Reference: <strong className="text-foreground font-mono">ZA-BATCH-412</strong></span>
                      <span>Regulation: <strong className="text-foreground font-mono">FICA 38/2001</strong></span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Button
                      size="lg"
                      className="w-full h-auto min-h-[3.25rem] py-2.5 px-4 bg-primary text-primary-foreground font-bold shadow-soft flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm"
                      onClick={() => setIsVeriflowOpen(true)}
                    >
                      <ShieldCheck className="size-5 shrink-0" />
                      <span>Complete FICA Identity Verification (2 Mins)</span>
                    </Button>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span>Takes under 2 minutes • Direct upload</span>
                      {me?.isAdmin ? (
                        <button
                          type="button"
                          onClick={handleResetStandardFlow}
                          className="underline hover:text-foreground text-[10px]"
                        >
                          Reset to Day 1
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Optional Fast-Track offer even on Day 2 */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    <div className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Want instant release right now?</span> Skip the rest of the 72h batch schedule.
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 shrink-0"
                      disabled={chargeMutation.isPending}
                      onClick={() => chargeMutation.mutate(UPSELL_OFFERS[1].downsell)}
                    >
                      <Zap className="size-3 mr-1 text-amber-500" />
                      Instant EFT — R 59.00
                    </Button>
                  </div>
                </div>
              ) : (
                // SUBCASE B3: Day 2 (>= 24h) - FICA Dossier Lodged
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5 space-y-3.5 shadow-soft">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <FileCheck className="size-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                            ✓ FICA DOSSIER LODGED
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono text-emerald-600">
                            SARB STAGE 2 CLEARED
                          </Badge>
                        </div>
                        <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                          FICA Verification Complete — Interbank Batch Staged
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-background/80 p-3 sm:p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Compliance Receipt:</span>
                      <span className="font-mono font-bold text-foreground">
                        {veriflowReceipt.reference || "ZA-I6JGA"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Verification Authority:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        SARB National Clearing Gateway
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Settlement Status:</span>
                      <span className="font-semibold text-foreground">
                        Stage 2 Approved • Final ACH Credit Staged
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                      All documents filed. Your recipient bank has received authorization to credit the funds during the interbank clearing window.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto flex-1 h-9 text-xs font-semibold"
                      onClick={() => setIsVeriflowOpen(true)}
                    >
                      <FileText className="size-3.5 mr-1.5 text-primary" />
                      View Official Veriflow KYC Receipt
                    </Button>
                    {me?.isAdmin ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={handleResetStandardFlow}
                      >
                        <RotateCcw className="size-3 mr-1" />
                        Reset Test
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            )}



            {/* Activated Add-ons list */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Clearance Configuration:
              </p>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border p-3 text-xs bg-card gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BadgeCheck className="size-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold break-words">FICA Identity & Account Verification</span>
                  </div>
                  <Badge variant="secondary" className="text-emerald-600 bg-emerald-500/10 font-bold self-start sm:self-auto shrink-0">
                    {veriflowReceipt ? "Dossier Lodged" : "Active"}
                  </Badge>
                </div>

                {/* 1. Instant EFT Speed */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border p-3 text-xs bg-card gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap className="size-4 text-amber-500 shrink-0" />
                    <span className="font-semibold break-words">
                      {hasInstantEft
                        ? "5-Minute Instant EFT Priority Clearing"
                        : "Standard Interbank Batch Clearing (48-72h)"}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-bold self-start sm:self-auto shrink-0">
                    {purchasedOffers.includes("instant_eft_express") || purchasedOffers.includes("instant_eft_lifetime")
                      ? "Lifetime Active"
                      : purchasedOffers.includes("instant_eft_today")
                      ? "Active Today"
                      : "Standard Queue"}
                  </Badge>
                </div>

                {/* 2. SARB & Bankserv Escrow */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border p-3 text-xs bg-card gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="size-4 text-indigo-500 shrink-0" />
                    <span className="font-semibold break-words">
                      {purchasedOffers.includes("sarb_bankserv_escrow_pass") || purchasedOffers.includes("sarb_bankserv_single_pass") || purchasedOffers.includes("sarb_settlement_automated") || purchasedOffers.includes("bankserv_escrow_bond")
                        ? "SARB Queue Bypass & Bankserv Escrow Bond"
                        : "Standard Interbank Batch Routing"}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-bold self-start sm:self-auto shrink-0">
                    {purchasedOffers.includes("sarb_bankserv_escrow_pass") || purchasedOffers.includes("sarb_settlement_automated") || purchasedOffers.includes("bankserv_escrow_bond")
                      ? "Insured Escrow"
                      : purchasedOffers.includes("sarb_bankserv_single_pass") || purchasedOffers.includes("sarb_settlement_priority") || purchasedOffers.includes("bankserv_escrow_basic")
                      ? "Active Today"
                      : "Standard"}
                  </Badge>
                </div>

                {/* 3. FICA Zero-Fee & SARS Tax Clearance */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border p-3 text-xs bg-card gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Percent className="size-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold break-words">
                      {purchasedOffers.includes("fica_sars_tax_exemption_full") || purchasedOffers.includes("fica_sars_provisional_waiver") || purchasedOffers.includes("tax_exemption_lifetime") || purchasedOffers.includes("sars_tax_exemption_full")
                        ? "FICA Zero-Deduction & SARS Tax Exemption (0% Retained)"
                        : "Standard Bank Administration & Tax Assessment"}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-bold self-start sm:self-auto shrink-0">
                    {purchasedOffers.includes("fica_sars_tax_exemption_full") || purchasedOffers.includes("tax_exemption_lifetime") || purchasedOffers.includes("sars_tax_exemption_full")
                      ? "100% Net Tax Exempt"
                      : purchasedOffers.includes("fica_sars_provisional_waiver") || purchasedOffers.includes("tax_exemption_subsidized") || purchasedOffers.includes("sars_tax_exemption_provisional")
                      ? "Provisional Waiver"
                      : "Standard"}
                  </Badge>
                </div>

                {/* 4. AML Anti-Fraud & Real-time UTR SMS Dispatch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border p-3 text-xs bg-card gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldAlert className="size-4 text-sky-500 shrink-0" />
                    <span className="font-semibold break-words">
                      {purchasedOffers.includes("aml_utr_full_pack") || purchasedOffers.includes("aml_utr_single_pack") || purchasedOffers.includes("aml_compliance_seal") || purchasedOffers.includes("utr_sms_dispatch_pack")
                        ? "AML Anti-Fraud Pre-Clearance & Real-Time UTR SMS"
                        : "Standard Bank Security Audit & In-App Tracking"}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-bold self-start sm:self-auto shrink-0">
                    {purchasedOffers.includes("aml_utr_full_pack") || purchasedOffers.includes("aml_compliance_seal")
                      ? "Whitelisted & SMS"
                      : purchasedOffers.includes("aml_utr_single_pack") || purchasedOffers.includes("aml_compliance_basic") || purchasedOffers.includes("utr_sms_dispatch_basic")
                      ? "Active Today"
                      : "Standard"}
                  </Badge>
                </div>

                {/* 5. VIP 2X Multiplier & High-Ticket Corporate Tasks */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border p-3 text-xs bg-card gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="size-4 text-purple-500 shrink-0" />
                    <span className="font-semibold break-words">
                      {purchasedOffers.includes("vip_vault_2x_lifetime") || purchasedOffers.includes("vip_vault_2x_trial") || purchasedOffers.includes("multiplier_2x_lifetime") || purchasedOffers.includes("vip_vault_lifetime") || (me?.profile.tier && me.profile.tier !== "regular")
                        ? "VIP 2X Multiplier + Corporate Tasks (Up to R 5,000/task)"
                        : "Standard Community Tasks"}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-bold self-start sm:self-auto shrink-0">
                    {purchasedOffers.includes("vip_vault_2x_lifetime") || purchasedOffers.includes("multiplier_2x_lifetime") || purchasedOffers.includes("vip_vault_lifetime") || (me?.profile.tier && me.profile.tier !== "regular")
                      ? "VIP Partner Active"
                      : purchasedOffers.includes("vip_vault_2x_trial") || purchasedOffers.includes("vip_vault_trial") || purchasedOffers.includes("multiplier_2x_monthly")
                      ? "Trial Pass"
                      : "Standard"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Interactive Timeline */}
            <div className="rounded-2xl border border-border p-3.5 sm:p-4 bg-muted/20 space-y-3">
              <p className="text-xs font-semibold text-foreground">Live Transfer Timeline:</p>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Identity & Bank Account Authenticated</p>
                    <p className="text-[11px] text-muted-foreground">FICA anti-fraud clearance passed</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className={`size-5 rounded-full text-white flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    hasInstantEft && eftTimeRemaining === 0 && !veriflowReceipt
                      ? "bg-destructive animate-bounce"
                      : hasInstantEft && veriflowReceipt
                      ? "bg-emerald-500"
                      : "bg-amber-500 animate-pulse"
                  }`}>
                    {hasInstantEft && veriflowReceipt ? "✓" : "⚡"}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {hasInstantEft && eftTimeRemaining === 0 && !veriflowReceipt
                        ? "Interbank Clearance Hold (FICA Verification Required)"
                        : hasInstantEft && veriflowReceipt
                        ? "FICA Compliance Transmitted — Clearance Release In Progress"
                        : hasInstantEft
                        ? "Interbank Priority Instant EFT Dispatch"
                        : "Interbank Standard Batch Queue"}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {hasInstantEft && eftTimeRemaining === 0 && !veriflowReceipt
                        ? "Beneficial owner identity verification required before release"
                        : hasInstantEft && veriflowReceipt
                        ? `Veriflow Reference ${veriflowReceipt.reference} lodged with clearing house`
                        : hasInstantEft
                        ? `Priority Fast-Track channel (Estimated release: ${formatTimer(eftTimeRemaining)})`
                        : "Standard batch processing queue (Position #412 — Estimated: 48-72h)"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 opacity-60">
                  <div className="size-5 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-[10px]">
                    🏦
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Banking App Credit Notification</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Capitec / FNB / Standard Bank / Absa / Nedbank / TymeBank alert</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <Button
                size="lg"
                className="w-full bg-primary text-primary-foreground font-bold h-auto min-h-[3rem] py-3 px-4 shadow-soft whitespace-normal break-words text-center flex items-center justify-center gap-1.5"
                onClick={() => void navigate({ to: "/wallet" })}
              >
                <span>Go to Wallet Overview</span>
                <ArrowRight className="size-4 shrink-0" />
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs h-auto min-h-[2.5rem] py-2 px-3 whitespace-normal break-words text-center"
                onClick={() => void navigate({ to: "/surveys" })}
              >
                Continue Watching Videos & Earning
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* DOWNSELL MODAL / DIALOG */}
      <Dialog open={activeDownsell !== null} onOpenChange={(open) => !open && setActiveDownsell(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md p-4 sm:p-6 max-h-[90dvh] overflow-y-auto rounded-2xl">
          {activeDownsell ? (
            <div className="space-y-4 sm:space-y-5">
              <div className="space-y-1.5 text-center px-1">
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold py-0.5">
                  {activeDownsell.badge}
                </Badge>
                <DialogTitle className="font-display text-base sm:text-xl font-bold text-foreground pt-1 leading-snug break-words">
                  {activeDownsell.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1 break-words">
                  {activeDownsell.subtitle}
                </DialogDescription>
              </div>

              {/* Price comparison */}
              <div className="rounded-xl border border-border bg-secondary/50 p-3 sm:p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-bold tracking-wide">
                    Special Downsell Price
                  </span>
                  <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold text-[11px] py-0.5 px-2 shrink-0">
                    Instant Activation
                  </Badge>
                </div>
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-foreground whitespace-nowrap">
                  {formatKes(activeDownsell.amount)}
                </div>
              </div>

              {/* Perks */}
              <div className="space-y-2">
                {activeDownsell.perks.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-foreground/90 leading-snug">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="break-words">{p}</span>
                  </div>
                ))}
              </div>

              {/* Downsell Buttons */}
              <div className="space-y-2.5 pt-2">
                <Button
                  size="lg"
                  className="w-full h-auto min-h-[3.5rem] py-2.5 px-3 bg-money hover:bg-money/90 text-money-foreground shadow-soft flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-[0.99] border-0"
                  disabled={chargeMutation.isPending}
                  onClick={() => chargeMutation.mutate(activeDownsell)}
                >
                  {chargeMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2 py-1 font-bold text-xs sm:text-sm">
                      <Loader2 className="size-4 animate-spin shrink-0" />
                      <span>Processing 1-Click...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-1.5 font-black text-xs sm:text-sm tracking-wide text-center leading-tight">
                        <Zap className="size-4 shrink-0 fill-current" />
                        <span>{me?.hasSavedCard ? `⚡ 1-Click: ${activeDownsell.ctaHeadline}` : activeDownsell.ctaHeadline}</span>
                      </div>
                      <div className="text-[11px] font-semibold opacity-90 tracking-normal text-center">
                        {me?.hasSavedCard ? `R ${activeDownsell.amount} • Charged to saved card (1-Click)` : activeDownsell.ctaSub}
                      </div>
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 cursor-pointer break-words leading-relaxed"
                  disabled={chargeMutation.isPending}
                  onClick={advanceToNextStep}
                >
                  {activeDownsell.declineText}
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* VERIFLOW KYC COMPLIANCE WIZARD & RECEIPT DOSSIER */}
      <VeriflowKycDialog
        open={isVeriflowOpen}
        onOpenChange={setIsVeriflowOpen}
        userId={me?.profile.id}
        defaultName={me?.profile.full_name || ""}
        defaultEmail={me?.email || ""}
        defaultPhone={me?.profile.mpesa_phone || me?.profile.phone || ""}
        defaultBank="Capitec Bank"
        defaultAccountNumber=""
        receiptData={veriflowReceipt}
        onComplete={(receipt) => {
          setVeriflowReceipt(receipt);
          try {
            if (me?.profile.id) {
              localStorage.setItem(`veriflow_kyc_receipt_${me.profile.id}`, JSON.stringify(receipt));
            }
            localStorage.removeItem("veriflow_kyc_receipt");
          } catch {}
          if (!me?.isAdmin) {
            void logFunnel({ data: { event: "kyc_submitted" } });
          }
          void saveVeriflowKyc({ data: receipt });
          void queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
          toast.success(`FICA Verification Completed! Official receipt ${receipt.reference} generated.`);
        }}
      />
    </div>
  );
}
