import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as UpChunk from "@mux/upchunk";
import {
  CheckCircle2,
  Film,
  Loader2,
  Play,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Hls from "hls.js";
import {
  checkMuxUploadStatus,
  createMuxDirectUpload,
  getMuxIntegrationStatus,
} from "@/lib/mux.functions";
import {
  getMuxPlaybackId,
  getMuxStreamUrl,
  getMuxThumbnailUrl,
  isHlsStream,
} from "@/lib/videos";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
};

export function VideoUploader({
  value,
  onChange,
  label = "Video",
  helperText = "Upload your video directly to Mux, or paste a video URL / Playback ID.",
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "ready" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");

  const { data: muxStatus } = useQuery({
    queryKey: ["admin-mux-status"],
    queryFn: () => getMuxIntegrationStatus(),
  });

  const createUpload = useServerFn(createMuxDirectUpload);
  const checkStatus = useServerFn(checkMuxUploadStatus);

  const playbackId = getMuxPlaybackId(value);
  const previewThumbnail = playbackId ? getMuxThumbnailUrl(playbackId) : undefined;
  const previewStream = playbackId ? getMuxStreamUrl(playbackId) : value;

  const [previewError, setPreviewError] = useState<string | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = previewVideoRef.current;
    setPreviewError(null);
    if (!video || !previewStream) return;

    video.muted = true;
    video.defaultMuted = true;

    let hls: Hls | null = null;

    if (isHlsStream(previewStream)) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(previewStream);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setPreviewError(null);
        });
        hls.on(Hls.Events.ERROR, (_event, errorData) => {
          if (errorData.fatal) {
            switch (errorData.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (errorData.response?.code === 404) {
                  setPreviewError("Mux returned 404 Not Found. Please check if this Playback ID has typos (IDs are case-sensitive).");
                } else {
                  hls?.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                setPreviewError(`Stream error: ${errorData.details || "Failed to load video"}`);
                hls?.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = previewStream;
        video.load();
        const handleError = () => {
          if (video.error && video.error.code !== 1) {
            setPreviewError("Could not load stream. Please verify the Playback ID or URL.");
          }
        };
        video.addEventListener("error", handleError, { once: true });
      } else {
        video.src = previewStream;
        video.load();
      }
    } else {
      video.src = previewStream;
      video.load();
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [previewStream]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|mov|webm|m4v|mkv)$/i)) {
      toast.error("Please select a valid video file (.mp4, .mov, .webm).");
      return;
    }

    if (!muxStatus?.configured) {
      toast.error(
        "Mux API keys are not configured yet. Configure them in Admin > Settings > Mux Video.",
      );
      return;
    }

    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setErrorMessage("");

    try {
      // 1. Get signed Direct Upload URL from Mux
      const { uploadUrl, uploadId } = await createUpload();

      // 2. Upload directly to Mux using UpChunk
      const upload = UpChunk.createUpload({
        endpoint: uploadUrl,
        file,
        chunkSize: 5120, // 5MB chunks for fast parallel uploads
      });

      upload.on("progress", (progress: { detail: number }) => {
        setUploadProgress(Math.round(progress.detail));
      });

      upload.on("success", async () => {
        setUploadStatus("processing");
        setUploadProgress(100);

        // 3. Poll Mux until asset is encoded and Playback ID is ready
        let attempts = 0;
        const maxAttempts = 40; // 60 seconds max

        const interval = setInterval(async () => {
          attempts++;
          try {
            const status = await checkStatus({ data: { uploadId } });

            if (status.status === "ready" && status.playbackId) {
              clearInterval(interval);
              setUploadStatus("ready");
              onChange(status.playbackId);
              toast.success("Video uploaded and ready on Mux!");
            } else if (status.status === "errored") {
              clearInterval(interval);
              setUploadStatus("error");
              setErrorMessage(status.error || "Mux encoding error.");
              toast.error(status.error || "Mux processing failed.");
            } else if (attempts >= maxAttempts) {
              clearInterval(interval);
              setUploadStatus("ready");
              toast.info("Upload completed! Processing in background.");
            }
          } catch (err: unknown) {
            if (attempts >= maxAttempts) {
              clearInterval(interval);
              setUploadStatus("error");
              setErrorMessage(err instanceof Error ? err.message : "Error checking upload");
            }
          }
        }, 1500);
      });

      upload.on("error", (err: { detail: { message?: string } }) => {
        setUploadStatus("error");
        const msg = err.detail?.message || "Upload to Mux failed";
        setErrorMessage(msg);
        toast.error(msg);
      });
    } catch (err: unknown) {
      setUploadStatus("error");
      const msg = err instanceof Error ? err.message : "Failed to initiate Mux upload";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-medium text-foreground">{label}</Label>
        {muxStatus?.configured ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-money">
            <CheckCircle2 className="size-3" /> Mux Upload Enabled
          </span>
        ) : (
          <span className="text-[11px] text-amber-500 font-medium">
            Mux API keys not configured
          </span>
        )}
      </div>

      {/* Drag & Drop Upload Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile) void handleFileSelect(droppedFile);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
        } ${uploadStatus === "uploading" || uploadStatus === "processing" ? "pointer-events-none opacity-90" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.m4v"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileSelect(file);
            e.target.value = "";
          }}
        />

        {uploadStatus === "uploading" ? (
          <div className="w-full max-w-xs space-y-2 py-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="truncate max-w-[200px]">{fileName}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress ?? 0} className="h-2.5 bg-secondary" />
            <p className="text-[11px] text-muted-foreground">
              Uploading directly to Mux ({fileSize})...
            </p>
          </div>
        ) : uploadStatus === "processing" ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="font-semibold text-sm">Processing video on Mux...</p>
            <p className="text-xs text-muted-foreground">
              Generating HLS streaming link and thumbnail. Almost done!
            </p>
          </div>
        ) : uploadStatus === "ready" && playbackId ? (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <div className="grid size-12 place-items-center rounded-full bg-money/15 text-money">
              <CheckCircle2 className="size-6" />
            </div>
            <p className="font-bold text-sm text-foreground">Video Ready on Mux!</p>
            <p className="text-xs text-muted-foreground">
              Playback ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{playbackId}</code>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Replace Video
            </Button>
          </div>
        ) : (
          <>
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                Click to upload video or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                MP4, MOV, or WebM. Processed instantly by Mux.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 rounded-full px-4 text-xs font-semibold shadow-soft"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Film className="size-3.5" /> Choose Video File
            </Button>
          </>
        )}

        {errorMessage ? (
          <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
            <XCircle className="size-3.5" /> {errorMessage}
          </div>
        ) : null}
      </div>

      {/* Manual Input (Fallback / Edit ID) */}
      <div className="space-y-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="Or paste Mux Playback ID / YouTube embed URL"
          className="text-xs h-9 font-mono"
        />
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      </div>

      {/* Live Preview if Mux Playback ID or video is present */}
      {playbackId ? (
        <div className="overflow-hidden rounded-xl border bg-black/5 p-2.5 space-y-2 shadow-soft">
          <div className="flex items-center justify-between text-xs font-medium px-1">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Play className="size-3 text-primary" /> Live Preview
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">{playbackId}</span>
          </div>
          <div className="relative aspect-video max-h-48 w-full overflow-hidden rounded-lg bg-black">
            <video
              ref={previewVideoRef}
              poster={previewThumbnail}
              controls
              playsInline
              muted
              className="size-full object-contain"
            />
          </div>
          {previewError ? (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive flex items-center gap-1.5">
              <XCircle className="size-3.5 shrink-0" />
              <span>{previewError}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
