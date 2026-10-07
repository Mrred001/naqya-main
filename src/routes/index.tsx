import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useSitePreferences } from "@/components/site/PreferencesProvider";

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
  const { language } = useSitePreferences();
  const english = language === "en";

  return (
    <main className="gateway-grid grid min-h-[100svh] md:grid-cols-2">
      <Link
        to="/naqya"
        aria-label={english ? "Enter NAQYA" : "ادخل إلى نقيا"}
        className="gateway-panel gateway-naqya group"
      >
        <img
          src="/naqya-logo-icon.svg"
          alt=""
          className="h-16 w-16 object-contain md:h-[4.5rem] md:w-[4.5rem]"
        />
        <div className="gateway-copy">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-primary md:text-sm">
            {english ? "THE CURATED LIBRARY" : "مكتبة المحتوى المنتقى"}
          </p>
          <h1 className="text-5xl font-bold tracking-[0.08em] md:text-7xl">NAQYA</h1>
          <p
            className="mt-4 max-w-md text-base leading-8 text-muted-foreground md:text-xl"
            dir={english ? "ltr" : "rtl"}
          >
            {english
              ? "Thoughtfully curated content worth your time."
              : "محتوى منتقى بعناية، يستحق وقتك."}
          </p>
          <span className="gateway-cta">
            {english ? "Explore NAQYA" : "ادخل نقيا"}
            <ArrowRight size={22} aria-hidden="true" />
          </span>
        </div>
        <span className="gateway-index">01 / 02</span>
      </Link>

      <Link
        to="/fcds"
        aria-label={english ? "Enter DARB FCDS" : "ادخل إلى درب FCDS"}
        className="gateway-panel gateway-darb group fcds-theme"
      >
        <img
          src="/naqya-fcds-logo.png"
          alt=""
          className="h-16 w-16 object-contain md:h-[4.5rem] md:w-[4.5rem]"
        />
        <div className="gateway-copy">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-primary md:text-sm">
            {english ? "YOUR COLLEGE, IN ONE PLACE" : "مواد كليتك في مكان واحد"}
          </p>
          <h2 className="text-5xl font-bold tracking-[0.08em] md:text-7xl">
            DARB
            <span className="mt-1 block font-mono tracking-normal text-primary">FCDS</span>
          </h2>
          <p
            className="mt-4 max-w-md text-base leading-8 text-muted-foreground md:text-xl"
            dir={english ? "ltr" : "rtl"}
          >
            {english
              ? "Course playlists and videos, organized for you."
              : "بلاي ليستات وفيديوهات موادك، مرتبة ليك."}
          </p>
          <span className="gateway-cta">
            {english ? "Explore DARB" : "ادخل درب"}
            <ArrowRight size={22} aria-hidden="true" />
          </span>
        </div>
        <span className="gateway-index">02 / 02</span>
      </Link>
    </main>
  );
}
