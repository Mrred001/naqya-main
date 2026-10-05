import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NAQYA" },
      {
        name: "description",
        content: "اختر مكتبتك — نقيا أو نقيا FCDS.",
      },
    ],
  }),
  component: Gateway,
});

function Gateway() {
  const panel =
    "group relative flex min-h-[50vh] flex-col overflow-hidden p-8 transition-colors md:min-h-[100dvh] md:p-14";

  return (
    <main className="grid min-h-[100dvh] md:grid-cols-2">

      {/* NAQYA */}
      <Link
        to="/naqya"
        className={`${panel} bg-background`}
      >
        {/* Logo */}
        <img
          src="/naqya-logo-icon.svg"
          alt=""
          className="h-16 w-16 object-contain"
        />

        {/* Content */}
        <div className="my-auto">
          <h1 className="text-5xl font-bold tracking-[0.08em] md:text-7xl">
            NAQYA
          </h1>

          <p className="mt-5 max-w-md text-lg text-muted-foreground" dir="rtl">
            محتوى منتقى بعناية، يستحق وقتك.
          </p>

          <p className="mt-8 text-sm font-medium text-primary">
            ENTER NAQYA →
          </p>
        </div>
      </Link>

      {/* NAQYA FCDS */}
      <Link
        to="/fcds"
        className={`${panel} bg-[#07110b] text-white`}
      >
        {/* Logo */}
        <img
          src="/naqya-fcds-logo.png"
          alt=""
          className="h-19 w-19 object-contain"
        />

        {/* Content */}
        <div className="my-auto">
          <h2 className="text-5xl font-bold tracking-[0.08em] md:text-7xl">
            NAQYA
            <span className="block font-mono tracking-normal text-green-400">
              FCDS
            </span>
          </h2>

          <p className="mt-5 max-w-md text-lg text-white/60" dir="rtl">
            اعثر على Playlist لمادتك.
          </p>

          <p className="mt-8 font-mono text-sm text-green-400">
            ENTER FCDS →
          </p>
        </div>

        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-green-500/10 blur-3xl" />
      </Link>

    </main>
  );
}