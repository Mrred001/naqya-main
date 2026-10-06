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

const intro =
  "ربنا أنعم علي وفهمت قاعدة بسيطة: الحاجة البتستهلكها هي في النهاية الحاجة البتنتجها. ومن وقتها بديت أحاول أركز على الحاجات البتنفع.";
const field =
  "mt-2 w-full rounded-xl border bg-background px-4 py-3 text-foreground outline-none focus:border-primary";

export function CommunityFooter({ fcds = false }: { fcds?: boolean }) {
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
      setError("اكتب تفاصيل المشكلة في ١٠ حروف على الأقل.");
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
      setError("تعذّر إرسال البلاغ حالياً. جرّب تاني، أو تواصل معاي عبر إنستغرام.");
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
              {fcds ? "درب FCDS — مصادر مادتك، بلا تشتت." : "نقيا — ما يستحق وقتك."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Curated by Ahmed Osama</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <button className={action}>
                  <UserRound size={16} />
                  من أنا
                </button>
              </DialogTrigger>
              <DialogContent
                className={`max-h-[85dvh] max-w-2xl overflow-y-auto rounded-3xl ${fcds ? "fcds-theme" : ""}`}
              >
                <DialogTitle className="text-2xl">من أنا</DialogTitle>
                <DialogDescription>أحمد أسامة · {fcds ? "درب FCDS" : "NAQYA"}</DialogDescription>
                <div className="space-y-5 text-base leading-loose">
                  <p>
                    أنا أحمد أسامة،{" "}
                    {fcds ? "طالب بالسنة الرابعة، وكاتب وصانع محتوى." : "كاتب وصانع محتوى."} بديت
                    رحلة فهم الذات قبل ٤ سنوات، وحصلت تغييرات كتيرة في حياتي. ومن أهم أسباب
                    التغييرات دي فضل الله، ثم المدخلات.
                  </p>
                  <p>{intro}</p>
                  {fcds ? (
                    <>
                      <p>
                        جات فكرة درب FCDS لما لاحظت إن طلب روابط الـPlaylists بتكرر كل فترة، سواء
                        من زملائي أو من الطلاب الجدد. ومن هنا سألت نفسي: ماذا لو في موقع يجمع قوائم
                        الشرح الخاصة بكل مادة، بشكل مرتب وجميل وسهل الوصول؟
                      </p>
                      <p>
                        وده البنسعى ليه هنا: تلقى مصادر مادتك في مكان واحد، وتوفر وقت البحث عشان
                        تركز على التعلّم، والأهم نقلل التشتت.
                      </p>
                    </>
                  ) : (
                    <p>
                      جات فكرة نقيا بسبب كثرة التشتت بين المصادر، وخصوصاً في ظل التأثير السلبي
                      للسوشيال ميديا؛ عشان نجمع المحتوى البستحق وقتك في مكان واحد.
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
                  الإبلاغ عن مشكلة
                </button>
              </DialogTrigger>
              <DialogContent className={`rounded-3xl ${fcds ? "fcds-theme" : ""}`}>
                <DialogTitle>الإبلاغ عن مشكلة</DialogTitle>
                <DialogDescription>
                  البلاغ بيوصل لأحمد في لوحة الإدارة. ما تكتب كلمات مرور أو معلومات حساسة.
                </DialogDescription>
                {sent ? (
                  <p role="status" className="py-6 text-primary">
                    شكراً ليك! بلاغك وصل، وحأراجعه.
                  </p>
                ) : (
                  <form onSubmit={submit} className="space-y-4">
                    <label className="block text-sm">
                      تفاصيل المشكلة
                      <textarea
                        name="details"
                        required
                        minLength={10}
                        maxLength={2000}
                        rows={5}
                        className={field}
                        placeholder="شنو الحصل؟ وكيف نقدر نكرر المشكلة؟"
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
                      {busy ? "جاري الإرسال…" : "إرسال البلاغ"}
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
              aria-label="تواصل معي على إنستغرام visionwithahmed"
            >
              <Instagram size={16} />
              تواصل معي
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
