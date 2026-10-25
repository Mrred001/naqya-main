import { SupportChatButton } from "@/components/chat/SupportChatButton";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Send, GitBranch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
import { darbCoursesQuery, calculatorTopics, type DarbResource } from "@/lib/darb-resources";
import { recommendationCourses, submitCommunity, type RequestKind } from "@/lib/community";
import { parseYouTube } from "@/lib/content";
const field =
  "mt-2 min-h-11 w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary";
export function CommunityRequestButton(props: {
  kind: RequestKind;
  resource?: DarbResource;
  iconOnly?: boolean;
}) {
  return props.kind === "message" ? (
    <SupportChatButton iconOnly={props.iconOnly ?? false} />
  ) : (
    <CommunityRequestFormButton {...props} />
  );
}
function CommunityRequestFormButton({
  kind,
  resource,
  iconOnly = false,
}: {
  kind: RequestKind;
  resource?: DarbResource;
  iconOnly?: boolean;
}) {
  const { language } = useSitePreferences();
  const en = language === "en";
  const t = (ar: string, eng: string) => (en ? eng : ar);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<boolean | null>(null);
  const [failure, setFailure] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const courses = useQuery({
    ...darbCoursesQuery,
    enabled: open && kind === "course_recommendation",
  });
  const recommend = kind === "course_recommendation";
  const calculator = kind.startsWith("calculator_");
  const suggest = kind === "calculator_suggestion";
  const label = recommend
    ? t("رشّح لمادة تانية", "Recommend for another course")
    : suggest
      ? t("اقترح شرح", "Suggest a tutorial")
      : t("اطلب شرح", "Request a tutorial");
  const Icon = recommend ? GitBranch : suggest ? Plus : Send;
  const available = resource ? recommendationCourses(courses.data ?? [], resource) : [];
  const visible = available.filter((c) =>
    `${c.name} ${c.code} ${c.year}`.toLowerCase().includes(search.toLowerCase()),
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    const details = String(data.get("details") ?? "").trim();
    const url = String(data.get("youtube_url") ?? "").trim();
    if (suggest && !parseYouTube(url)) {
      setFailure(t("أدخل رابط يوتيوب صحيح.", "Enter a valid YouTube URL."));
      return;
    }
    setBusy(true);
    setFailure("");
    try {
      const n = await submitCommunity(
        kind,
        {
          details,
          ...(recommend && resource ? { resource_id: resource.id } : {}),
          ...(calculator
            ? {
                title: String(data.get("title") ?? "").trim(),
                calculator_topic: String(data.get("topic") ?? ""),
                calculator_model: String(data.get("model") ?? "").trim(),
                ...(suggest ? { youtube_url: url } : {}),
              }
            : {}),
        },
        selected,
      );
      setSent(n > 0);
    } catch (error) {
      const message = (error as { message?: string }).message ?? "";
      setFailure(
        message.includes("already in the guide")
          ? t("الشرح ده موجود في الدليل أصلاً.", "This tutorial is already in the guide.")
          : message.includes("try again later")
            ? t(
                "وصلت الحد المؤقت للطلبات، جرّب بعد شوية.",
                "Too many requests. Please try again later.",
              )
            : t("ما قدرنا نرسل الطلب. جرّب تاني.", "Could not send your request. Try again."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          if (!value) {
            setSent(null);
            setFailure("");
            setSelected([]);
            setSearch("");
          }
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={
            iconOnly
              ? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 text-blue-600 transition-colors hover:bg-blue-500/20 focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-blue-400"
              : calculator
                ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-400/70 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 px-4 py-2.5 text-sm font-bold text-[#211604] shadow-sm shadow-amber-500/15 transition-colors hover:from-amber-200 hover:to-amber-300 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                : "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          }
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {!iconOnly && label}
        </button>
      </DialogTrigger>
      <DialogContent
        className="fcds-theme max-h-[85dvh] overflow-y-auto rounded-2xl bg-background text-foreground sm:max-w-lg"
        dir={en ? "ltr" : "rtl"}
      >
        <DialogTitle className="px-6 text-xl">{label}</DialogTitle>
        <DialogDescription>
          {recommend
            ? t(
                "اختار المواد البتستفيد من نفس الشرح. الربط بيتم بعد مراجعة أحمد.",
                "Choose courses that benefit from this source. Ahmed reviews recommendations before linking.",
              )
            : t(
                "حدد العملية وموديل آلتك. الطلب بينتظر مراجعة أحمد قبل النشر.",
                "Choose the operation and calculator model. Requests need Ahmed's review before publication.",
              )}
        </DialogDescription>
        {sent !== null ? (
          <div role="status" className="py-6 text-center leading-relaxed">
            {sent
              ? t("وصلت، شكراً لمساهمتك!", "Received. Thank you for contributing!")
              : t(
                  "الترشيح موجود أو المادة مرتبطة بالشرح أصلاً، ما كررنا الطلب.",
                  "This recommendation is already pending or the source is already linked; no duplicate was created.",
                )}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              {calculator && (
                <>
                  <label className="block text-sm">
                    {t("عنوان الشرح أو العملية المطلوبة", "Tutorial title or operation")}
                    <input name="title" required minLength={3} maxLength={200} className={field} />
                  </label>
                  {suggest && (
                    <label className="block text-sm">
                      {t("رابط فيديو أو قائمة يوتيوب", "YouTube video or playlist URL")}
                      <input
                        type="url"
                        name="youtube_url"
                        required
                        maxLength={2000}
                        dir="ltr"
                        className={field}
                      />
                    </label>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      {t("نوع العملية", "Operation")}
                      <select name="topic" required className={field}>
                        <option value="">{t("اختار العملية", "Choose operation")}</option>
                        {calculatorTopics.map((topic) => (
                          <option key={topic.value} value={topic.value}>
                            {en ? topic.en : topic.ar}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      {t("موديل الآلة", "Calculator model")}
                      <input
                        name="model"
                        required
                        maxLength={200}
                        placeholder="Casio fx-991EX"
                        className={field}
                      />
                    </label>
                  </div>
                </>
              )}
              {recommend && (
                <>
                  <p dir="auto" className="break-words text-sm font-semibold">
                    {resource?.title}
                  </p>
                  {courses.isPending ? (
                    <p role="status">{t("جاري تحميل المواد…", "Loading courses…")}</p>
                  ) : courses.isError ? (
                    <p role="alert">
                      {t("تعذر تحميل المواد.", "Could not load courses.")}{" "}
                      <button
                        type="button"
                        onClick={() => void courses.refetch()}
                        className="underline"
                      >
                        {t("حاول تاني", "Retry")}
                      </button>
                    </p>
                  ) : (
                    <fieldset className="space-y-3">
                      <legend className="text-sm">
                        {t("اختار المواد", "Choose courses")} · {selected.length}
                      </legend>
                      <input
                        type="search"
                        aria-label={t("ابحث عن مادة", "Search courses")}
                        placeholder={t("اسم المادة أو كودها…", "Course name or code…")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={field}
                      />
                      <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border p-2">
                        {visible.map((course) => (
                          <label
                            key={course.slug}
                            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg p-2 text-sm hover:bg-accent"
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(course.slug)}
                              onChange={(e) =>
                                setSelected((current) =>
                                  e.target.checked
                                    ? [...current, course.slug]
                                    : current.filter((s) => s !== course.slug),
                                )
                              }
                              className="h-4 w-4 accent-emerald-500"
                            />
                            <span className="min-w-0 break-words">
                              {course.name}
                              <span className="mx-2 text-xs text-muted-foreground">
                                {course.year}
                              </span>
                            </span>
                          </label>
                        ))}
                        {!visible.length && (
                          <p className="p-3 text-sm text-muted-foreground">
                            {available.length
                              ? t("ما لقينا مادة مطابقة.", "No matching course.")
                              : t(
                                  "الشرح مرتبط بكل المواد الحالية.",
                                  "This source is already linked to every current course.",
                                )}
                          </p>
                        )}
                      </div>
                    </fieldset>
                  )}
                </>
              )}
              <label className="block text-sm">
                {recommend
                  ? t("سبب الترشيح (اختياري)", "Reason (optional)")
                  : t("تفاصيل إضافية (اختياري)", "Additional details (optional)")}
                <textarea name="details" maxLength={3000} rows={4} className={field} />
              </label>
            </fieldset>
            {failure && (
              <p role="alert" className="text-sm text-red-500">
                {failure}
              </p>
            )}
            <button
              type="submit"
              disabled={
                busy || (recommend && (!selected.length || courses.isError || courses.isPending))
              }
              className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-40"
            >
              {busy ? t("جاري الإرسال…", "Sending…") : t("إرسال", "Send")}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
