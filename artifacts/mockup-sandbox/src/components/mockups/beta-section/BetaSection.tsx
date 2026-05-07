import { CheckCircle2 } from "lucide-react";

const BULLETS = [
  "Verified producer profiles across coffee, cacao, avocado, and superfoods",
  "RFQ engine connecting buyers with verified Colombian producers",
  "Compliance documentation support per destination market",
  "Active onboarding across Colombia's key agricultural regions",
];

export function BetaSection() {
  return (
    <div className="min-h-screen bg-[#0a5c3a] flex items-center justify-center py-0 px-4">
      <div className="w-full max-w-6xl py-16">

        {/* Row 1 — BETA badge, left-aligned */}
        <div className="mb-6">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
            Beta
          </span>
        </div>

        {/* Row 2 — Heading, center-aligned */}
        <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight text-white text-center mb-10">
          Building Colombia's direct trade infrastructure.
        </h2>

        {/* Row 3 — Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Column 1 — paragraph, left-aligned */}
          <p className="text-white/70 text-base leading-relaxed text-left">
            Fincava is currently in beta. We are onboarding a limited group of suppliers and buyers to shape the platform and build the first trusted trade network. Early participants gain priority access and visibility as the network grows.
          </p>

          {/* Column 2 — bullets, left-aligned */}
          <ul className="space-y-3 text-left">
            {BULLETS.map(bullet => (
              <li key={bullet} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-white/50 shrink-0 mt-0.5" />
                <span className="text-white/80 text-sm leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>

        </div>
      </div>
    </div>
  );
}
