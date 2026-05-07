// Variation B — Elevated Structure
// Fixes: BETA with subtle fill badge, heading fits tighter (3xl→4xl), 
// left column uses larger pull-quote style text, right column uses 
// left-border accent rows instead of check icons for a more editorial feel.

const BULLETS = [
  "Verified producer profiles across coffee, cacao, avocado, and superfoods",
  "RFQ engine connecting buyers with verified Colombian producers",
  "Compliance documentation support per destination market",
  "Active onboarding across Colombia's key agricultural regions",
];

export function BetaSectionV2() {
  return (
    <div className="bg-[#0a5c3a] flex items-center justify-center px-4">
      <div className="w-full max-w-6xl py-14">

        {/* Row 1 — BETA badge with subtle fill, left-aligned */}
        <div className="mb-5">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300 bg-white/8 rounded-md px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Beta Access
          </span>
        </div>

        {/* Row 2 — Heading, center-aligned, constrained width so it stays one line */}
        <h2 className="text-[38px] md:text-[46px] font-serif font-bold leading-[1.12] text-white text-center mb-10">
          Building Colombia's direct trade infrastructure.
        </h2>

        {/* Row 3 — Two columns: 45 / 55 */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-12 items-start">

          {/* Column 1 (45%) — larger pull-quote body copy */}
          <div className="lg:col-span-5">
            <p className="text-white/85 text-[16px] leading-[1.8] text-left font-light">
              Fincava is currently in beta. We are onboarding a limited group of suppliers and buyers to shape the platform and build the first trusted trade network. Early participants gain priority access and visibility as the network grows.
            </p>
          </div>

          {/* Vertical divider — hidden on mobile */}
          <div className="hidden lg:flex lg:col-span-1 justify-center">
            <div className="w-px h-full bg-white/15 min-h-[120px]" />
          </div>

          {/* Column 2 (55%) — left-border accent bullet rows */}
          <ul className="lg:col-span-5 space-y-0 text-left divide-y divide-white/10">
            {BULLETS.map((bullet, i) => (
              <li key={bullet} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                <span className="text-[11px] font-bold text-emerald-400 mt-0.5 tabular-nums shrink-0 w-4">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-white/80 text-sm leading-[1.65]">{bullet}</span>
              </li>
            ))}
          </ul>

        </div>
      </div>
    </div>
  );
}
