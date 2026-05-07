import { ArrowRight, ArrowDown, CheckCircle2, Globe, ShieldCheck, FileText, Languages, Users, Search, ChevronRight } from "lucide-react";

const SUPPLIER_ITEMS = [
  "Build a credible profile",
  "Show capabilities clearly",
  "Improve export readiness",
  "Gain visibility with buyers",
];

const FINCAVA_ITEMS = [
  { icon: FileText, text: "Supplier intelligence profiles" },
  { icon: ShieldCheck, text: "Verification & trust signals" },
  { icon: FileText, text: "RFQ intake & routing" },
  { icon: Languages, text: "AI-assisted translation" },
  { icon: Users, text: "Human-managed introductions" },
];

const BUYER_ITEMS = [
  "Discover verified suppliers",
  "Submit sourcing requirements",
  "Receive relevant introductions",
  "Reduce sourcing friction",
  "Communicate across languages",
];

const PROCESS_STEPS = [
  "Suppliers are profiled and verified",
  "Buyers submit sourcing needs",
  "FINCAVA structures and routes RFQs",
  "Translation and trust signals reduce friction",
  "Qualified introductions are made",
];

const SCALE_ITEMS = [
  "Structured supplier data",
  "Trust infrastructure",
  "Multilingual supplier-buyer bridge",
  "Repeatable RFQ workflow",
];

export function ValueFlow() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] mb-4 text-[#22c55e]">
            Managed B2B Sourcing Concierge
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-5 text-foreground">
            How FINCAVA Creates Value
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">FINCAVA structures supplier information, builds trust, and connects qualified Colombian suppliers with serious buyers.</p>
        </div>
      </section>
      {/* ── THREE-COLUMN FLOW ──────────────────────────────────────── */}
      <section className="pb-20 bg-background">
        <div className="container mx-auto px-4">

          {/* Desktop: side-by-side | Mobile: stacked */}
          <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0">

            {/* ── SUPPLIERS card ── */}
            <div className="flex-1 rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/5 p-7 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-[#22c55e]" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#22c55e] mb-0.5">
                    Suppliers
                  </div>
                  <div className="text-sm text-muted-foreground">Colombian producers</div>
                </div>
              </div>
              <ul className="space-y-3 flex-1">
                {SUPPLIER_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Arrow (desktop: right | mobile: down) ── */}
            <div className="flex items-center justify-center md:px-3 py-2 md:py-0">
              <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground/40" />
              <ArrowDown className="block md:hidden w-6 h-6 text-muted-foreground/40" />
            </div>

            {/* ── FINCAVA hub card ── */}
            <div className="flex-1 rounded-2xl border-2 border-[#16a34a]/60 bg-[#0a1f12] p-7 flex flex-col relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#22c55e]/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#22c55e]" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#22c55e] mb-0.5">
                      FINCAVA
                    </div>
                    <div className="text-xs text-white/50">Platform layer</div>
                  </div>
                </div>
                <p className="text-xs text-white/40 italic mb-5">
                  Technology-enabled trust. Human-led introductions.
                </p>
                <ul className="space-y-3 flex-1">
                  {FINCAVA_ITEMS.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm text-white/80">
                      <Icon className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Arrow ── */}
            <div className="flex items-center justify-center md:px-3 py-2 md:py-0">
              <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground/40" />
              <ArrowDown className="block md:hidden w-6 h-6 text-muted-foreground/40" />
            </div>

            {/* ── BUYERS card ── */}
            <div className="flex-1 rounded-2xl border border-sky-200 bg-sky-50 p-7 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <Search className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-sky-600 mb-0.5">
                    Buyers
                  </div>
                  <div className="text-sm text-sky-700/60">International importers</div>
                </div>
              </div>
              <ul className="space-y-3 flex-1">
                {BUYER_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-sky-900">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-20 bg-card border-t border-b border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] mb-4 text-[#22c55e]">
              How it works
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step} className="relative flex flex-col items-center text-center group">
                {/* Step number */}
                <div className="w-10 h-10 rounded-full border-2 border-[#22c55e] bg-[#22c55e]/10 flex items-center justify-center mb-4 shrink-0 z-10">
                  <span className="text-sm font-bold text-[#22c55e]">{i + 1}</span>
                </div>
                {/* Connector line between steps (hidden on last) */}
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-px bg-border" />
                )}
                <p className="text-sm text-muted-foreground leading-snug">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── WHY THIS SCALES ──────────────────────────────────────── */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-2xl border border-border bg-card p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] mb-4 text-[#22c55e]">
                  Why this scales
                </span>
                <h3 className="text-2xl md:text-3xl font-serif font-bold mb-4 text-foreground">
                  Repeatable sourcing infrastructure
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  FINCAVA is building repeatable sourcing infrastructure, not just a
                  supplier directory.
                </p>
              </div>
              <div>
                <ul className="space-y-4">
                  {SCALE_ITEMS.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center shrink-0">
                        <ChevronRight className="w-4 h-4 text-[#22c55e]" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
