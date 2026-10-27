import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  PartyPopper,
  Pause,
  Play,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import MuxVideo from "@mux/mux-video-react";
import { getSurvey, submitSurvey } from "@/lib/surveys.functions";
import { formatKes } from "@/lib/format";
import { getMuxPlaybackId, getYouTubeEmbedUrl } from "@/lib/videos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function NextDayCountdown() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      // South Africa Standard Time (SAST, UTC+2)
      const sastNow = new Date(now.getTime() + (2 * 60 + now.getTimezoneOffset()) * 60000);
      const tomorrowSast = new Date(sastNow);
      tomorrowSast.setHours(24, 0, 0, 0);
      const diffMs = tomorrowSast.getTime() - sastNow.getTime();
      if (diffMs <= 0) {
        setTimeLeft("00:00:00");
        return;
      }
      const hours = String(Math.floor(diffMs / 3600000)).padStart(2, "0");
      const minutes = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, "0");
      const seconds = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, "0");
      setTimeLeft(`${hours}:${minutes}:${seconds}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-emerald-950/80 text-[#065F46] dark:text-emerald-300 px-3.5 py-1 text-xs font-medium border border-[#A7F3D0] dark:border-emerald-800/60 shadow-2xs">
      <Clock className="size-3.5 text-[#059669] dark:text-emerald-400" />
      <span>
        Next 5 daily tasks unlock in: <strong className="font-mono font-bold text-[#059669] dark:text-emerald-400">{timeLeft || "--:--:--"}</strong>
      </span>
    </div>
  );
}
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/surveys/$surveyId")({
  head: () => ({
    meta: [
      { title: "Watch & Earn — TikTok Reward Coin" },
      {
        name: "description",
        content: "Watch this short video and claim your reward instantly to your wallet.",
      },
      { property: "og:title", content: "Watch & Earn — TikTok Reward Coin" },
      {
        property: "og:description",
        content: "Watch short videos and earn Rands every day in South Africa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VideoTaskPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-display text-xl font-bold">Video task unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button asChild className="mt-6">
        <Link to="/surveys">Back to videos</Link>
      </Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <p className="font-semibold">Video not found.</p>
      <Button asChild className="mt-4">
        <Link to="/surveys">Back to videos</Link>
      </Button>
    </div>
  ),
});

function VideoTaskPage() {
  const { surveyId } = Route.useParams();
  return <VideoRunner key={surveyId} surveyId={surveyId} />;
}

function VideoRunner({ surveyId }: { surveyId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submit = useServerFn(submitSurvey);

  const { data, isLoading } = useQuery({
    queryKey: ["survey", surveyId],
    queryFn: () => getSurvey({ data: { surveyId } }),
    staleTime: 30_000,
  });

  const videoTask = data?.videoTask;
  const targetDuration = videoTask?.durationSeconds ?? 15;
  const youtubeUrl = getYouTubeEmbedUrl(videoTask?.videoUrl ?? "");
  const muxPlaybackId = getMuxPlaybackId(videoTask?.videoUrl ?? "");

  const [secondsWatched, setSecondsWatched] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showCenterIcon, setShowCenterIcon] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [selectedTag, setSelectedTag] = useState<string>("🔥 Great content");
  const [comment, setComment] = useState("");
  const [done, setDone] = useState<{ reward: number; completedToday: number; limit: number; balance: number; nextSurveyId?: string | null } | null>(
    null,
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Safety net: always reset runner state when surveyId changes
  useEffect(() => {
    setDone(null);
    setSecondsWatched(0);
    setIsPlaying(false);
    setComment("");
    setRating(5);
    setSelectedTag("🔥 Great content");
  }, [surveyId]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = Math.floor(videoRef.current.currentTime);
    setSecondsWatched((prev) => Math.max(prev, Math.min(targetDuration, cur)));
  };

  // Setup video playback properties
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoTask?.videoUrl || youtubeUrl) return;

    video.playsInline = true;
    video.volume = 1.0;
  }, [videoTask?.videoUrl, youtubeUrl]);

  // Watch countdown timer: ticks strictly while video is actively playing
  useEffect(() => {
    if (!data || data.alreadyCompleted || data.remaining === 0 || done) return;

    const timer = setInterval(() => {
      const video = videoRef.current;
      const isActivelyPlaying = youtubeUrl
        ? isPlaying
        : Boolean(video && !video.paused && !video.ended && video.readyState >= 2);

      if (isActivelyPlaying) {
        setSecondsWatched((prev) => {
          if (prev >= targetDuration) {
            clearInterval(timer);
            return targetDuration;
          }
          return prev + 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [data, done, isPlaying, targetDuration, youtubeUrl]);

  const canClaim = secondsWatched >= targetDuration;
  const progressPercent = Math.min(100, (secondsWatched / targetDuration) * 100);

  const mutation = useMutation({
    mutationFn: () => {
      const trimmedComment = comment.trim();
      if (!trimmedComment) {
        throw new Error("Please write a short comment about the video to submit your review.");
      }
      return submit({
        data: {
          surveyId,
          watchDurationSeconds: secondsWatched,
          rating,
          review: trimmedComment,
          tags: [selectedTag],
        },
      });
    },
    onSuccess: (result) => {
      setDone(result);
      void queryClient.invalidateQueries({ queryKey: ["surveys"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["missions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      // 1-click play with sound: ALWAYS unmute on play click!
      video.muted = false;
      video.volume = 1.0;
      setIsMuted(false);

      video
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Unmuted play blocked by browser, falling back to muted:", err);
          video.muted = true;
          setIsMuted(true);
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch((e) => console.error("Playback failed completely:", e));
        });
    } else {
      // If currently playing but muted, clicking on it activates the sound immediately!
      if (video.muted || isMuted) {
        video.muted = false;
        video.volume = 1.0;
        setIsMuted(false);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
    setShowCenterIcon(true);
    setTimeout(() => setShowCenterIcon(false), 700);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const newMute = !videoRef.current.muted;
    videoRef.current.muted = newMute;
    if (!newMute) {
      videoRef.current.volume = 1.0;
    }
    setIsMuted(newMute);
  };

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-[520px] w-full rounded-3xl" />
      </div>
    );
  }

  // Finished and rewarded
  if (done) {
    const isAllDone = done.completedToday >= done.limit;
    return (
      <div className="mx-auto max-w-md py-12 text-center animate-fade-in space-y-4 px-4">
        <div className="animate-coin-pop mx-auto grid size-20 place-items-center rounded-full bg-[#10B981] text-white shadow-lift">
          <PartyPopper className="size-10" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground">
            +{formatKes(done.reward)} Added!
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Review submitted! The reward was added directly to your wallet balance.
          </p>
          {!isAllDone && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-money/10 text-money px-3.5 py-1 text-xs font-bold border border-money/20">
              Wallet Balance: {formatKes(done.balance)}
            </div>
          )}
        </div>

        {isAllDone ? (
          <div className="rounded-2xl border border-[#A7F3D0] dark:border-emerald-800/40 bg-[#E8F8F0] dark:bg-emerald-950/30 p-5 text-center space-y-2.5 shadow-2xs">
            <p className="font-bold text-sm sm:text-base text-[#065F46] dark:text-emerald-300">
              🎉 All 5 Daily Video Reviews Completed!
            </p>
            <p className="text-xs sm:text-sm text-[#047857] dark:text-emerald-400 max-w-md mx-auto leading-relaxed">
              Your earnings have been added to your wallet balance. You can request your payout now, or return in 24 hours to find your next 5 daily video tasks.
            </p>
            <div className="pt-1">
              <NextDayCountdown />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3.5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span>Task {done.completedToday} of {done.limit} complete</span>
              <span>{Math.round((done.completedToday / done.limit) * 100)}%</span>
            </div>
            <Progress value={(done.completedToday / done.limit) * 100} className="h-2 bg-primary/15 [&>div]:bg-primary" />
            <p className="text-[11px] pt-0.5">
              {done.limit - done.completedToday} more video{done.limit - done.completedToday === 1 ? "" : "s"} remaining today to reach your daily withdrawal goal!
            </p>
          </div>
        )}

        <div className="pt-3 flex flex-col gap-2.5 max-w-sm mx-auto w-full">
          {isAllDone ? (
            <>
              <Button
                asChild
                size="lg"
                className="w-full h-12 text-sm sm:text-base font-bold bg-[#10B981] hover:bg-[#059669] text-white shadow-md flex items-center justify-center gap-2 rounded-xl transition-all"
              >
                <Link to="/wallet">
                  <Wallet className="size-4 sm:size-5" />
                  <span>Go to Wallet &amp; Request Payout</span>
                  <ChevronRight className="size-4 sm:size-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="w-full h-12 text-sm sm:text-base font-bold bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-md flex items-center justify-center rounded-xl transition-all"
              >
                <Link to="/dashboard">
                  Back to Dashboard
                </Link>
              </Button>
            </>
          ) : (
            <>
              {done.nextSurveyId ? (
                <Button
                  size="lg"
                  className="w-full h-12 text-sm sm:text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft rounded-xl cursor-pointer"
                  onClick={() => {
                    void navigate({
                      to: "/surveys/$surveyId",
                      params: { surveyId: done.nextSurveyId! },
                    });
                  }}
                >
                  Watch Next Video ({done.completedToday + 1}/{done.limit}) →
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full h-12 text-sm sm:text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft rounded-xl cursor-pointer"
                  onClick={() => {
                    void navigate({ to: "/surveys" });
                  }}
                >
                  Today's Videos ({done.completedToday}/{done.limit}) →
                </Button>
              )}
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 font-semibold rounded-xl"
              >
                <Link to="/surveys">
                  Today's Videos
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Daily limit reached: strict lock!
  if (!data.isAdmin && (data.remaining === 0 || (data.completedToday ?? 0) >= (data.limit ?? 5) || data.doneForToday)) {
    return (
      <div className="mx-auto max-w-md py-12 text-center px-4 space-y-4">
        <div className="animate-coin-pop mx-auto grid size-20 place-items-center rounded-full bg-[#10B981] text-white shadow-lift">
          <PartyPopper className="size-10" />
        </div>
        <div className="rounded-2xl border border-[#A7F3D0] dark:border-emerald-800/40 bg-[#E8F8F0] dark:bg-emerald-950/30 p-5 text-center space-y-2.5 shadow-2xs">
          <p className="font-bold text-sm sm:text-base text-[#065F46] dark:text-emerald-300">
            🎉 All 5 Daily Video Reviews Completed!
          </p>
          <p className="text-xs sm:text-sm text-[#047857] dark:text-emerald-400 max-w-md mx-auto leading-relaxed">
            Your earnings have been added to your wallet balance. You can request your payout now, or return in 24 hours to find your next 5 daily video tasks.
          </p>
          <div className="pt-1">
            <NextDayCountdown />
          </div>
        </div>
        <div className="pt-3 flex flex-col gap-2.5 max-w-sm mx-auto w-full">
          <Button
            asChild
            size="lg"
            className="w-full h-12 text-sm sm:text-base font-bold bg-[#10B981] hover:bg-[#059669] text-white shadow-md flex items-center justify-center gap-2 rounded-xl transition-all"
          >
            <Link to="/wallet">
              <Wallet className="size-4 sm:size-5" />
              <span>Go to Wallet &amp; Request Payout</span>
              <ChevronRight className="size-4 sm:size-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="w-full h-12 text-sm sm:text-base font-bold bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-md flex items-center justify-center rounded-xl transition-all"
          >
            <Link to="/dashboard">
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Locked: user must complete previous video in sequence first
  if (data.isLocked) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4 px-4">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-amber-500/10 text-amber-500">
          <Lock className="size-8" />
        </div>
        <h1 className="font-display text-2xl font-bold">Video Locked</h1>
        <p className="text-sm text-muted-foreground">
          Watch videos in sequential order! Complete Video {data.activeTaskNumber ?? 1} first to unlock this one.
        </p>
        <div className="pt-2 flex flex-col gap-2.5">
          {data.activeSurveyId ? (
            <Button
              className="bg-primary text-primary-foreground font-bold h-12 rounded-xl shadow-soft"
              onClick={() => void navigate({ to: "/surveys/$surveyId", params: { surveyId: data.activeSurveyId! } })}
            >
              Go to Video {data.activeTaskNumber ?? 1}
            </Button>
          ) : null}
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => void navigate({ to: "/surveys" })}>
            View Video List
          </Button>
        </div>
      </div>
    );
  }

  // Already completed this video
  if (data.alreadyCompleted) {
    return (
      <div className="mx-auto max-w-md py-16 text-center px-4 space-y-4">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="font-display text-2xl font-bold">You Already Watched This Video</h1>
        <p className="text-sm text-muted-foreground">
          Watch the next video in your daily sequence to continue earning.
        </p>
        <div className="pt-2 flex flex-col gap-2.5">
          {data.activeSurveyId ? (
            <Button
              className="bg-primary text-primary-foreground font-bold h-12 rounded-xl shadow-soft"
              onClick={() => void navigate({ to: "/surveys/$surveyId", params: { surveyId: data.activeSurveyId! } })}
            >
              Continue to Video {data.activeTaskNumber ?? 1} →
            </Button>
          ) : null}
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => void navigate({ to: "/surveys" })}>
            View Video List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md pb-8">
      {/* Timer Progression Card (matching user reference screenshot) */}
      <div className="mb-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Sparkles className="size-4 text-emerald-500 fill-emerald-500/20" />
            <span>
              {secondsWatched < targetDuration ? (
                <>
                  Watch to earn reward: <strong className="text-foreground font-semibold">{targetDuration - secondsWatched}s remaining</strong>
                </>
              ) : (
                <span className="text-money font-bold">
                  ✓ Watch completed! Leave your review below
                </span>
              )}
            </span>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <Progress value={progressPercent} className="h-1.5 bg-muted/60 [&>div]:bg-primary" />
      </div>

      {/* Video Container (TikTok / Reels Style 9:16) */}
      <div className="relative aspect-[9/16] w-full max-h-[640px] overflow-hidden rounded-3xl bg-black shadow-lift border border-border/40 select-none">
        {youtubeUrl ? (
          <iframe
            src={youtubeUrl}
            title={videoTask?.title}
            className="size-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="relative size-full cursor-pointer" onClick={togglePlay}>
            <MuxVideo
              ref={videoRef}
              playbackId={muxPlaybackId ?? undefined}
              src={!muxPlaybackId ? videoTask?.videoUrl : undefined}
              poster={videoTask?.thumbnailUrl}
              autoPlay={false}
              playsInline
              loop
              muted={isMuted}
              preload="auto"
              metadata={{
                video_id: muxPlaybackId || videoTask?.id,
                video_title: videoTask?.title,
                player_name: "Google Opinion Rewards Player",
              }}
              className="size-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPlaying={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Tap to Play Center Overlay when not playing */}
            {!isPlaying ? (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 text-white backdrop-blur-[2px] transition-all cursor-pointer"
                onClick={togglePlay}
              >
                <div className="grid size-16 sm:size-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift hover:scale-105 transition-transform">
                  <Play className="size-8 sm:size-10 ml-1 fill-current" />
                </div>
                <span className="mt-3 text-xs sm:text-sm font-semibold tracking-wide bg-black/60 px-4 py-1.5 rounded-full">
                  Tap to play video
                </span>
              </div>
            ) : null}

            {/* Play/Pause Animated Center Feedback */}
            {showCenterIcon && isPlaying ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none transition-opacity">
                <div className="grid size-16 place-items-center rounded-full bg-black/60 text-white backdrop-blur">
                  <Play className="size-8 ml-1" />
                </div>
              </div>
            ) : null}

            {/* Top Video Controls: Sound toggle */}
            <div className="absolute left-3 top-3 z-20">
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleMute}
                className="h-8 gap-1.5 rounded-full bg-black/50 px-3 text-xs text-white backdrop-blur hover:bg-black/70 border-0"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="size-3.5" /> Tap for sound
                  </>
                ) : (
                  <>
                    <Volume2 className="size-3.5" /> Sound on
                  </>
                )}
              </Button>
            </div>

            {/* Floating Help / Support Button (matching screenshot) */}
            <div className="absolute right-3.5 bottom-3.5 z-20">
              <Button
                asChild
                size="icon"
                className="size-10 rounded-full bg-primary text-primary-foreground shadow-lift hover:bg-primary/90 text-sm font-bold"
              >
                <Link to="/support" aria-label="Support Help">
                  ?
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Review & Claim Reward Section */}
      <div className="mt-4 space-y-3">
        {canClaim ? (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="size-4" /> Leave Review to Claim Reward
              </span>
              <Badge variant="secondary" className="text-xs font-bold text-money">
                +{formatKes(data.reward)}
              </Badge>
            </div>

            {/* 5-Star Rating Selector */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Rate this video:</p>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                    aria-label={`${star} star`}
                  >
                    <Star
                      className={`size-6 ${
                        star <= rating
                          ? "fill-amber-400 text-amber-400 drop-shadow"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-bold text-foreground">
                  {rating === 5
                    ? "Excellent (5/5)"
                    : rating === 4
                    ? "Very Good (4/5)"
                    : rating === 3
                    ? "Good (3/5)"
                    : rating === 2
                    ? "Fair (2/5)"
                    : "Poor (1/5)"}
                </span>
              </div>
            </div>

            {/* Quick Feedback Tags */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Feedback tag:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "🔥 Great content",
                  "💡 Very informative",
                  "⭐ Highly recommend",
                  "👍 Loved it",
                  "✨ High quality",
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      selectedTag === tag
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/60 text-secondary-foreground hover:bg-secondary"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Required Comment Input (strictly empty by default, mandatory to type) */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="commentInput" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Write your comment / review <span className="text-destructive">*</span></span>
                <span className="text-[10px] text-destructive font-semibold">Required</span>
              </label>
              <Input
                id="commentInput"
                placeholder="Write your review about this video..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-background text-xs h-10 border-border/80 focus-visible:ring-primary rounded-xl"
                required
              />
              {!comment.trim() && (
                <p className="text-[11px] text-muted-foreground">
                  ✍️ Comment required to claim your +{formatKes(data.reward)} reward.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              size="lg"
              disabled={mutation.isPending || !comment.trim()}
              onClick={() => {
                if (!comment.trim()) {
                  toast.error("Please write a comment about the video to claim your reward.");
                  return;
                }
                mutation.mutate();
              }}
              className="w-full h-12 text-sm sm:text-base font-bold bg-money text-money-foreground hover:bg-money/90 shadow-lift disabled:opacity-50 rounded-xl"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Submitting review &amp; crediting +{formatKes(data.reward)}...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" /> Submit Review &amp; Claim +{formatKes(data.reward)}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-[#EEF4FF] dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 p-4 text-center text-[#1A73E8] dark:text-blue-400 font-semibold text-sm sm:text-base shadow-xs select-none">
            ⏳ Watch {Math.max(0, targetDuration - secondsWatched)}s to unlock review &amp; reward (+{formatKes(data.reward)})
          </div>
        )}
      </div>
    </div>
  );
}
