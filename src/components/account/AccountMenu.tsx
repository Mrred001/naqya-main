import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAccount } from "./AccountProvider";
import { GoogleSignIn } from "./GoogleSignIn";

export function AccountMenu() {
  const { user, ready } = useAccount();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    setBusy(false);
    if (error) toast.error("ما قدرنا نسجّل خروجك. جرّب تاني.");
    else setOpen(false);
  }
  return (
    <>
      <button
        type="button"
        disabled={!ready}
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-xl border px-3 py-2 text-xs sm:text-sm hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
      >
        {user ? "حسابي" : "دخول"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogTitle>{user ? "حسابك في نقيا" : "احفظ المحتوى وارجع ليه"}</DialogTitle>
          <DialogDescription>
            {user
              ? "محفوظاتك بتتزامن مع حسابك على أجهزتك."
              : "التسجيل اختياري. تقدر تتصفّح وتشاهد بدون حساب."}
          </DialogDescription>
          {user ? (
            <>
              <Link
                to="/saved"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-primary px-4 py-3 text-center text-primary-foreground"
              >
                المحفوظات
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={signOut}
                className="rounded-xl border px-4 py-3"
              >
                {busy ? "جاري الخروج…" : "تسجيل خروج من الجهاز ده"}
              </button>
            </>
          ) : (
            <GoogleSignIn />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
