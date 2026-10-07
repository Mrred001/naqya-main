import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAccount } from "./AccountProvider";
import { GoogleSignIn } from "./GoogleSignIn";

export function AccountMenu() {
  const fcds = useRouterState({ select: (state) => state.location.pathname.startsWith("/fcds") });
  const { user, ready } = useAccount();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const metadata = user?.user_metadata ?? {};
  const avatarUrl =
    (typeof metadata["avatar_url"] === "string" && metadata["avatar_url"]) ||
    (typeof metadata["picture"] === "string" && metadata["picture"]) ||
    undefined;
  const avatarLabel =
    (typeof metadata["full_name"] === "string" && metadata["full_name"]) ||
    (typeof metadata["name"] === "string" && metadata["name"]) ||
    user?.email ||
    "حسابي";

  async function signOut() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) toast.error("ما قدرنا نسجّل خروجك. جرّب تاني.");
      else setOpen(false);
    } catch {
      toast.error("ما قدرنا نسجّل خروجك. جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="حسابي"
            title={avatarLabel}
            className="shrink-0 rounded-full ring-offset-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" />
              <AvatarFallback>
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={10}
          className={`w-60 rounded-2xl p-2 ${fcds ? "fcds-theme text-foreground" : ""}`}
        >
          <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
            {avatarLabel}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-3 py-2.5">
            <Link to="/saved">
              <span>المحفوظات</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={busy}
            onSelect={(event) => {
              event.preventDefault();
              void signOut();
            }}
            className="cursor-pointer rounded-xl px-3 py-2.5 text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{busy ? "جاري الخروج…" : "تسجيل خروج من الجهاز ده"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={!ready}
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-xl border px-3 py-2 text-xs sm:text-sm hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
      >
        دخول
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className={fcds ? "fcds-theme text-foreground" : undefined}>
          <DialogTitle>احفظ المحتوى وارجع ليه</DialogTitle>
          <DialogDescription>التسجيل اختياري. تقدر تتصفّح وتشاهد بدون حساب.</DialogDescription>
          <GoogleSignIn />
        </DialogContent>
      </Dialog>
    </>
  );
}
