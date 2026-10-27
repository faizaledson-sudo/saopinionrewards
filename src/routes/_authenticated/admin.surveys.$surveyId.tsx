import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { getAdminSurvey, saveSurvey } from "@/lib/admin.functions";
import { TIER_LABELS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoUploader } from "@/components/admin/VideoUploader";

type QuestionType = "single_choice" | "multi_choice" | "scale" | "text" | "number";
type Tier = "regular" | "vip1" | "vip2" | "vip3";

type DraftQuestion = {
  id?: string | null;
  type: QuestionType;
  text: string;
  options: string;
  required: boolean;
};

export const Route = createFileRoute("/_authenticated/admin/surveys/$surveyId")({
  head: () => ({
    meta: [
      { title: "Survey editor — SurveyPesa admin" },
      {
        name: "description",
        content: "Create or edit a survey: questions, categories, minimum plan and publish status.",
      },
      { property: "og:title", content: "Survey editor — SurveyPesa admin" },
      { property: "og:description", content: "Build the survey bank for your panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SurveyEditor,
  errorComponent: ({ error }) => (
    <div className="py-16 text-center">
      <p className="font-semibold">Could not load this survey</p>
      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="py-16 text-center">Survey not found.</div>,
});

const emptyQuestion: DraftQuestion = {
  type: "single_choice",
  text: "",
  options: "Yes\nNo",
  required: true,
};

function SurveyEditor() {
  const { surveyId } = Route.useParams();
  const isNew = surveyId === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const save = useServerFn(saveSurvey);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-survey", surveyId],
    queryFn: () => getAdminSurvey({ data: { surveyId } }),
    enabled: !isNew,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [creator, setCreator] = useState("@tiktok_za");
  const [category, setCategory] = useState("Entertainment");
  const [minTier, setMinTier] = useState<Tier>("regular");
  const [minutes, setMinutes] = useState("1");
  const [status, setStatus] = useState<"draft" | "active" | "closed">("active");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);

  useEffect(() => {
    if (!data) return;
    setTitle(data.survey.title);
    const desc = data.survey.description ?? "";
    if (desc.startsWith("{") && desc.endsWith("}")) {
      try {
        const parsed = JSON.parse(desc) as Record<string, unknown>;
        setVideoUrl(typeof parsed.video_url === "string" ? parsed.video_url : "");
        setCreator(typeof parsed.creator === "string" ? parsed.creator : "@tiktok_za");
        setDescription(typeof parsed.caption === "string" ? parsed.caption : "");
      } catch {
        setDescription(desc);
      }
    } else {
      setDescription(desc);
    }
    setCategory(data.survey.category);
    setMinTier(data.survey.min_tier as Tier);
    setMinutes(String(data.survey.estimated_minutes));
    setStatus(data.survey.status as "draft" | "active" | "closed");
    setQuestions(
      data.questions.length
        ? data.questions.map((question) => ({
            id: question.id,
            type: question.type as QuestionType,
            text: question.text,
            options: Array.isArray(question.options)
              ? (question.options as unknown[]).map(String).join("\n")
              : "",
            required: question.required,
          }))
        : [],
    );
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => {
      const payloadDesc =
        videoUrl.trim() || creator.trim()
          ? JSON.stringify({
              video_url: videoUrl.trim(),
              creator: creator.trim() || "@tiktok_za",
              caption: description.trim(),
              duration: 15,
            })
          : description;

      return save({
        data: {
          id: isNew ? null : surveyId,
          title,
          description: payloadDesc,
          category,
          min_tier: minTier,
          estimated_minutes: Number(minutes) || 1,
          status,
          questions: questions
            .filter((q) => q.text.trim().length > 0)
            .map((question) => ({
              id: question.id ?? null,
              type: question.type,
              text: question.text,
              options: ["single_choice", "multi_choice"].includes(question.type)
                ? question.options
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                : [],
              required: question.required,
            })),
        },
      });
    },
    onSuccess: () => {
      toast.success("Task saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
      void queryClient.invalidateQueries({ queryKey: ["surveys"] });
      void navigate({ to: "/admin" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isNew && isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => void navigate({ to: "/admin" })}>
        <ArrowLeft className="mr-1 size-4" /> Back to admin
      </Button>

      <h1 className="font-display text-3xl font-bold">{isNew ? "New survey" : "Edit survey"}</h1>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-base">Survey details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Viral Amapiano Dance Challenge"
            />
          </div>
          {/* Video Uploader (Mux Direct Upload & Manual ID/URL) */}
          <div className="space-y-4">
            <VideoUploader
              value={videoUrl}
              onChange={setVideoUrl}
              label="Video (Upload directly to Mux or paste link)"
              helperText="Upload any MP4/MOV file directly, or paste a Mux Playback ID / YouTube link."
            />
            <div className="space-y-1.5">
              <Label htmlFor="creator">Creator Handle</Label>
              <Input
                id="creator"
                value={creator}
                onChange={(event) => setCreator(event.target.value)}
                placeholder="@tiktok_za"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Caption / Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short caption shown on the video."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minutes">Estimated minutes</Label>
              <Input
                id="minutes"
                type="number"
                min={1}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Minimum plan</Label>
              <Select value={minTier} onValueChange={(value) => setMinTier(value as Tier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["regular", "vip1", "vip2", "vip3"] as Tier[]).map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {TIER_LABELS[tier]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as "draft" | "active" | "closed")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-base">Questions</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setQuestions((prev) => [...prev, { ...emptyQuestion }])}
          >
            <Plus className="mr-1 size-4" /> Add question
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <GripVertical className="size-4" /> Question {index + 1}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove question"
                  disabled={questions.length === 1}
                  onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`q-${index}-text`}>Question text</Label>
                <Input
                  id={`q-${index}-text`}
                  value={question.text}
                  onChange={(event) => updateQuestion(index, { text: event.target.value })}
                  placeholder="How often do you use M-Pesa in a week?"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value) => updateQuestion(index, { type: value as QuestionType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_choice">Single choice</SelectItem>
                      <SelectItem value="multi_choice">Multiple choice</SelectItem>
                      <SelectItem value="scale">Scale 1–5</SelectItem>
                      <SelectItem value="text">Free text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    id={`q-${index}-required`}
                    checked={question.required}
                    onCheckedChange={(checked) => updateQuestion(index, { required: checked })}
                  />
                  <Label htmlFor={`q-${index}-required`}>Required</Label>
                </div>
              </div>

              {question.type === "single_choice" || question.type === "multi_choice" ? (
                <div className="space-y-1.5">
                  <Label htmlFor={`q-${index}-options`}>Options (one per line)</Label>
                  <Textarea
                    id={`q-${index}-options`}
                    rows={4}
                    value={question.options}
                    onChange={(event) => updateQuestion(index, { options: event.target.value })}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => void navigate({ to: "/admin" })}>
          Cancel
        </Button>
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save survey
        </Button>
      </div>
    </div>
  );
}
