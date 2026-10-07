import { useState, type FormEvent } from "react";
import { Flag, Instagram, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSitePreferences } from "./PreferencesProvider";

const intro =
  "ربنا أنعم علي وفهمت قاعدة بسيطة: الحاجة البتستهلكها هي في النهاية الحاجة البتنتجها. ومن وقتها بديت أحاول أركز على الحاجات البتنفع.";
const field =
  "mt-2 w-full rounded-xl border bg-background px-4 py-3 text-foreground outline-none focus:border-primary";

export function CommunityFooter({ fcds = false }: { fcds?: boolean }) {
  const { language } = useSitePreferences();
  const english = language === "en";
  const t = (ar: string, en: string) => (english ? en : ar);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const details = String(form.get("details") || "").trim();
    if (details.length < 10) {
      setError(t("اكتب تفاصيل المشكلة في ١٠ حروف على الأقل.", "Please describe the issue in at least 10 characters."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: failure } = await supabase
        .from("site_reports")
        .insert({
          library: fcds ? "fcds" : "general",
          details,
          page_path: window.location.pathname,
        });
      if (failure) throw failure;
      setSent(true);
    } catch {
      setError(t("تعذّر إرسال البلاغ حالياً. جرّب تاني، أو تواصل معاي عبر إنستغرام.", "Could not submit the report. Try again or contact me on Instagram."));
    } finally {
      setBusy(false);
    }
  }
  const action =
    "inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors hover:border-primary hover:text-primary";
  return (
    <footer className={`${fcds ? "fcds-theme" : ""} mt-20 border-t bg-card/40`}>
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="font-semibold">
              {fcds ? t("درب FCDS — مصادر مادتك، بلا تشتت.", "DARB FCDS — course resources, without the clutter.") : t("نقيا — ما يستحق وقتك.", "NAQYA — worth your time.")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Created by visionwithahmed</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <button className={action}>
                  <UserRound size={16} />
                  {t("من أنا", "About me")}
                </button>
              </DialogTrigger>
              <DialogContent
                className={`max-h-[85dvh] max-w-2xl overflow-y-auto rounded-3xl ${fcds ? "fcds-theme" : ""}`}
              >
                <DialogTitle className="text-2xl">{t("من أنا", "About me")}</DialogTitle>
                <DialogDescription>Ahmed Osama · {fcds ? "DARB FCDS" : "NAQYA"}</DialogDescription>
                <div className="space-y-5 text-base leading-loose">
                  <p>
                    {english ? (
                      <>I’m Ahmed Osama, {fcds ? "a fourth-year student, writer, and content creator." : "a writer and content creator."} I started a journey of self-discovery four years ago, and it changed a lot in my life. By God’s grace, the things I take in have been a major part of that change.</>
                    ) : (
                      <>أنا أحمد أسامة، {fcds ? "طالب بالسنة الرابعة، وكاتب وصانع محتوى." : "كاتب وصانع محتوى."} بديت رحلة فهم الذات قبل ٤ سنوات، وحصلت تغييرات كتيرة في حياتي. ومن أهم أسباب التغييرات دي فضل الله، ثم المدخلات.</>
                    )}
                  </p>
                  <p>{english ? "God helped me understand a simple idea: what you consume is ultimately what you produce. Since then, I’ve tried to focus on things that are useful." : intro}</p>
                  {fcds ? (
                    <>
                      <p>
                        {english ? "DARB FCDS came from noticing how often students ask for course playlist links. I wondered: what if there were one organized, easy-to-use place for every course’s learning resources?" : "جات فكرة درب FCDS لما لاحظت إن طلب روابط الـPlaylists بتكرر كل فترة، سواء من زملائي أو من الطلاب الجدد. ومن هنا سألت نفسي: ماذا لو في موقع يجمع قوائم الشرح الخاصة بكل مادة، بشكل مرتب وجميل وسهل الوصول؟"}
                      </p>
                      <p>
                        {english ? "That’s what we’re building: your course resources in one place, less time searching, and more time learning with fewer distractions." : "وده البنسعى ليه هنا: تلقى مصادر مادتك في مكان واحد، وتوفر وقت البحث عشان تركز على التعلّم، والأهم نقلل التشتت."}
                      </p>
                    </>
                  ) : (
                    <p>
                      {english ? "NAQYA was created to reduce the noise across online sources and social media by bringing together content that is worth your time." : "جات فكرة نقيا بسبب كثرة التشتت بين المصادر، وخصوصاً في ظل التأثير السلبي للسوشيال ميديا؛ عشان نجمع المحتوى البستحق وقتك في مكان واحد."}
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={open}
              onOpenChange={(value) => {
                setOpen(value);
                if (!value) {
                  setSent(false);
                  setError("");
                }
              }}
            >
              <DialogTrigger asChild>
                <button className={action}>
                  <Flag size={16} />
                  {t("الإبلاغ عن مشكلة", "Report a problem")}
                </button>
              </DialogTrigger>
              <DialogContent className={`rounded-3xl ${fcds ? "fcds-theme" : ""}`}>
                <DialogTitle>{t("الإبلاغ عن مشكلة", "Report a problem")}</DialogTitle>
                <DialogDescription>
                  {t("البلاغ بيوصل لأحمد في لوحة الإدارة. ما تكتب كلمات مرور أو معلومات حساسة.", "Reports go to Ahmed’s admin dashboard. Don’t include passwords or sensitive information.")}
                </DialogDescription>
                {sent ? (
                  <p role="status" className="py-6 text-primary">
                    {t("شكراً ليك! بلاغك وصل، وحأراجعه.", "Thanks! Your report was sent and I’ll review it.")}
                  </p>
                ) : (
                  <form onSubmit={submit} className="space-y-4">
                    <label className="block text-sm">
                      {t("تفاصيل المشكلة", "What happened?")}
                      <textarea
                        name="details"
                        required
                        minLength={10}
                        maxLength={2000}
                        rows={5}
                        className={field}
                        placeholder={t("شنو الحصل؟ وكيف نقدر نكرر المشكلة؟", "What happened, and how can we reproduce it?")}
                      />
                    </label>
                    {error ? (
                      <p role="alert" className="text-sm text-destructive">
                        {error}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {busy ? t("جاري الإرسال…", "Sending…") : t("إرسال البلاغ", "Send report")}
                    </button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
            <a
              href="https://www.instagram.com/visionwithahmed/"
              target="_blank"
              rel="noopener noreferrer"
              className={action}
              aria-label={t("تواصل معي على إنستغرام visionwithahmed", "Contact me on Instagram: visionwithahmed")}
            >
              <Instagram size={16} />
              {t("تواصل معي", "Contact me")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
