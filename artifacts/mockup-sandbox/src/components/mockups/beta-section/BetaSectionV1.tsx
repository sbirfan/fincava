import { CheckCircle2 } from "lucide-react";

const BULLETS = [
  "Verified producer profiles across coffee, cacao, avocado, and superfoods",
  "RFQ engine connecting buyers with verified Colombian producers",
  "Compliance documentation support per destination market",
  "Active onboarding across Colombia's key agricultural regions",
];

// Variation A — Refined Compact
// Fixes: BETA as a pill badge, tighter heading (single-line at lg), 
// 40/60 column split, horizontal rule separator, larger body copy.
export function BetaSectionV1() {
  return (
    <div className="bg-[#0a5c3a] flex items-center justify-center px-4">
      <div className="w-full max-w-6xl py-14">

        {/* Row 1 — BETA pill, left-aligned */}
        <div className="mb-7">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 border border-white/20 rounded-full px-3 py-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Beta
          </span>
        </div>

        {/* Row 2 — Heading, center-aligned */}
        <h2 className="text-[40px] md:text-[48px] font-serif font-bold leading-[1.1] text-white text-center mb-10 max-w-3xl mx-auto">
          Building Colombia's direct trade infrastructure.
        </h2>

        {/* Hairline divider */}
        <div className="border-t border-white/15 mb-10" />

        {/* Row 3 — Two columns: 40 / 60 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

          {/* Column 1 (40%) — paragraph */}
          <p className="lg:col-span-2 text-white/75 text-[15px] leading-[1.75] text-left">
            Fincava is currently in beta. We are onboarding a limited group of suppliers and buyers to shape the platform and build the first trusted trade network. Early participants gain priority access and visibility as the network grows.
          </p>

          {/* Column 2 (60%) — bullets */}
          <ul className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-left">
            {BULLETS.map(bullet => (
              <li key={bullet} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-[3px]" />
                <span className="text-white/80 text-sm leading-[1.6]">{bullet}</span>
              </li>
            ))}
          </ul>

        </div>
      </div>
    </div>
  );
}
