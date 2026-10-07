import { Bookmark as BookmarkIcon } from "lucide-react";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bookmarkColumn, bookmarksQuery, type BookmarkTarget } from "@/lib/bookmarks";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAccount } from "./AccountProvider";
import { GoogleSignIn } from "./GoogleSignIn";
import { useSitePreferences } from "@/components/site/PreferencesProvider";

export function SaveButton({ kind, id }: BookmarkTarget) {
  const { language } = useSitePreferences();
  const english = language === "en";
  const t = (ar: string, en: string) => (english ? en : ar);
  const { user, ready, refreshSession } = useAccount();
  const [open, setOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);
  const client = useQueryClient();
  const query = useQuery(bookmarksQuery(user?.id));
  const column = bookmarkColumn(kind);
  const saved = query.data?.find((row) => row[column] === id);
  const mutation = useMutation({
    mutationFn: async (activeUser: User) => {
      const result = saved
        ? await supabase
            .from("user_bookmarks")
            .delete()
            .eq("id", saved.id)
            .eq("user_id", activeUser.id)
        : await supabase.from("user_bookmarks").insert({ user_id: activeUser.id, [column]: id });
      if (result.error && result.error.code !== "23505") throw result.error;
    },
    onSuccess: (_data, activeUser) => {
      void client.invalidateQueries({ queryKey: ["bookmarks", activeUser.id] });
    },
    onError: () => toast.error(t("ما قدرنا نغيّر المحفوظات. جرّب تاني.", "Could not update saved items. Try again.")),
  });
  const handleSave = async () => {
    let activeUser = user;
    if (!activeUser) {
      setCheckingSession(true);
      const session = await refreshSession();
      setCheckingSession(false);
      if (session.error) {
        toast.error(t("ما قدرنا نتحقق من حسابك. جرّب تاني.", "Could not verify your account. Try again."));
        return;
      }
      activeUser = session.user;
      if (!activeUser) {
        setOpen(true);
        return;
      }
    }
    if (query.isError && user?.id === activeUser.id) {
      void query.refetch();
      toast.error(t("تعذّر تحميل المحفوظات. حاول تاني.", "Could not load saved items. Try again."));
      return;
    }
    mutation.mutate(activeUser);
  };
  return (
    <>
      <button
        type="button"
        aria-pressed={Boolean(saved)}
        disabled={
          !ready || checkingSession || mutation.isPending || Boolean(user && query.isPending)
        }
        onClick={() => void handleSave()}
        className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm hover:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <BookmarkIcon
          size={16}
          className={saved ? "fill-primary text-primary" : ""}
          aria-hidden="true"
        />
        {checkingSession
          ? t("جاري التحقق…", "Checking…")
          : mutation.isPending
            ? t("جاري الحفظ…", "Saving…")
            : saved
              ? t("محفوظ", "Saved")
              : t("احفظ لوقت لاحق", "Save for later")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={english ? "ltr" : "rtl"}>
          <DialogTitle>{t("محفوظاتك معاك في أي جهاز", "Your saved items on every device")}</DialogTitle>
          <DialogDescription>
            {t("سجّل بقوقل، وبعد الرجوع اضغط حفظ على المصدر البتختاره. المشاهدة ما بتحتاج حساب.", "Sign in with Google, then save any resource to your account. Watching does not require an account.")}
          </DialogDescription>
          <GoogleSignIn />
        </DialogContent>
      </Dialog>
    </>
  );
}
