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

export function SaveButton({ kind, id }: BookmarkTarget) {
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
    onError: () => toast.error("ما قدرنا نغيّر المحفوظات. جرّب تاني."),
  });
  const handleSave = async () => {
    let activeUser = user;
    if (!activeUser) {
      setCheckingSession(true);
      const session = await refreshSession();
      setCheckingSession(false);
      if (session.error) {
        toast.error("ما قدرنا نتحقق من حسابك. جرّب تاني.");
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
      toast.error("تعذّر تحميل المحفوظات. حاول تاني.");
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
          ? "جاري التحقق…"
          : mutation.isPending
            ? "جاري الحفظ…"
            : saved
              ? "محفوظ"
              : "احفظ لوقت لاحق"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogTitle>محفوظاتك معاك في أي جهاز</DialogTitle>
          <DialogDescription>
            سجّل بقوقل، وبعد الرجوع اضغط حفظ على المصدر البتختاره. المشاهدة ما بتحتاج حساب.
          </DialogDescription>
          <GoogleSignIn />
        </DialogContent>
      </Dialog>
    </>
  );
}
