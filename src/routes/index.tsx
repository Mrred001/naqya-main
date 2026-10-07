import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NAQYA & DARB FCDS" },
      {
        name: "description",
        content: "اختر مكتبتك — نقيا أو درب FCDS.",
      },
    ],
  }),
  component: Gateway,
});

function Gateway() {
  return (
    <main className="gateway-grid grid min-h-[100dvh] md:grid-cols-2">
      <Link to="/naqya" className="gateway-panel gateway-naqya group">
        <img
          src="/naqya-logo-icon.svg"
          alt=""
          className="h-16 w-16 object-contain md:h-[4.5rem] md:w-[4.5rem]"
        />

        <div className="gateway-copy">
          <h1 className="text-5xl font-bold tracking-[0.08em] md:text-7xl">
            NAQYA
          </h1>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl" dir="rtl">
            محتوى منتقى بعناية، يستحق وقتك.
          </p>
          <span className="gateway-cta">
            ادخل نقيا <ArrowRight size={22} aria-hidden="true" />
          </span>
        </div>
      </Link>

      <Link to="/fcds" className="gateway-panel gateway-darb group fcds-theme">
        <img
          src="/naqya-fcds-logo.png"
          alt=""
          className="h-16 w-16 object-contain md:h-[4.5rem] md:w-[4.5rem]"
        />

        <div className="gateway-copy">
          <h2 className="text-5xl font-bold tracking-[0.08em] md:text-7xl">
            DARB
            <span className="mt-1 block font-mono tracking-normal text-primary">
              FCDS
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl" dir="rtl">
            اعثر على Playlist لمادتك.
          </p>
          <span className="gateway-cta">
            ادخل درب <ArrowRight size={22} aria-hidden="true" />
          </span>
        </div>
      </Link>
    </main>
  );
}
