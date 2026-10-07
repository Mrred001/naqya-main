import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resourceProgressQuery, type ProgressStatus } from "@/lib/resource-progress";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAccount } from "./AccountProvider";
import { GoogleSignIn } from "./GoogleSignIn";

export function ResourceProgress({ id }: { id: string }) {
  const { user, ready, refreshSession } = useAccount();
  const { language } = useSitePreferences();
  const t = (ar: string, en: string) => language === "en" ? en : ar;
  const client = useQueryClient();
  const query = useQuery(resourceProgressQuery(user?.id));
  const current = query.data?.find((row) => row.fcds_playlist_id === id)?.status;
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const mutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: ProgressStatus | null }) => {
      const result = status
        ? await supabase.from("user_resource_progress").upsert(
            { user_id: userId, fcds_playlist_id: id, status },
            { onConflict: "user_id,fcds_playlist_id" },
          )
        : await supabase.from("user_resource_progress").delete()
            .eq("user_id", userId).eq("fcds_playlist_id", id);
      if (result.error) throw result.error;
    },
    onSuccess: (_data, { userId }) => {
      void client.invalidateQueries({ queryKey: ["resource-progress", userId] });
    },
    onError: () => toast.error(t("ما قدرنا نحفظ تقدمك. جرّب تاني.", "Could not save your progress. Try again.")),
  });

  const change = async (status: ProgressStatus) => {
    let activeUser = user;
    if (!activeUser) {
      setChecking(true);
      const session = await refreshSession();
      setChecking(false);
      if (session.error) {
        toast.error(t("ما قدرنا نتحقق من حسابك. جرّب تاني.", "Could not verify your account. Try again."));
        return;
      }
      activeUser = session.user;
      if (!activeUser) { setOpen(true); return; }
    }
    if (query.isError) {
      void query.refetch();
      toast.error(t("تعذّر تحميل تقدمك. جرّب تاني.", "Could not load your progress. Try again."));
      return;
    }
    mutation.mutate({ userId: activeUser.id, status: current === status ? null : status });
  };

  return (
    <>
      <div className="inline-flex flex-wrap gap-2" role="group" aria-label={t("تقدمك في المصدر", "Your resource progress")}>
        {(["in_progress", "completed"] as const).map((status) => {
          const Icon = status === "completed" ? Check : Play;
          return (
            <button key={status} type="button" aria-pressed={current === status}
              disabled={!ready || checking || mutation.isPending || Boolean(user && query.isPending)}
              onClick={() => void change(status)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${current === status ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary"}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {status === "completed" ? t("خلصته", "Completed") : t("ببدأ فيه", "In progress")}
            </button>
          );
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={language === "en" ? "ltr" : "rtl"}>
          <DialogTitle>{t("تابع تقدمك في المواد", "Track your course progress")}</DialogTitle>
          <DialogDescription>{t("سجّل دخول عشان تحفظ تقدمك وترجع ليه من أي جهاز. بعد الدخول اختار حالة المصدر.", "Sign in to save your progress across devices, then choose the resource status.")}</DialogDescription>
          <GoogleSignIn />
        </DialogContent>
      </Dialog>
    </>
  );
}
