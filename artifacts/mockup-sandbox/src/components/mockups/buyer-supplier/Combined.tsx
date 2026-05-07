import {
  ShieldCheck, FileText, BarChart3, Globe,
  Banknote, Truck, Star, ArrowRight, CheckCircle2,
} from "lucide-react";

const BUYER_FEATURES = [
  {
    icon: ShieldCheck,
    label: "Verified Producers",
    desc: "Every supplier is screened, certified, and quality-reviewed before listing on the platform.",
  },
  {
    icon: FileText,
    label: "Compliance Ready",
    desc: "Origin certificates, phytosanitary docs, and customs paperwork prepared for your destination market.",
  },
  {
    icon: BarChart3,
    label: "Shipment Visibility",
    desc: "Planned: milestone tracking from Colombia to your destination port, coordinated through partner logistics networks.",
  },
  {
    icon: Globe,
    label: "Competitive Sourcing",
    desc: "Post an RFQ and receive quotes from multiple verified Colombian producers within 48 hours.",
  },
];

const SUPPLIER_FEATURES = [
  {
    icon: Globe,
    label: "Global Buyer Network",
    desc: "Access vetted importers, distributors, and retail buyers across the Middle East, Asia, Europe, and North America.",
  },
  {
    icon: Truck,
    label: "Logistics Support (Launching Soon)",
    desc: "We coordinate cold chain, port clearance, and freight forwarding so you focus on growing and harvesting.",
  },
  {
    icon: Star,
    label: "Your Story, Professionally Presented",
    desc: "Origin documentation, certifications, and your farm's story presented to buyers in a format they trust.",
  },
];

export function Combined() {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-6xl">

        {/* ── Section header ── */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] mb-4 text-[#16a34a]">
            Who it's for
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-5">
            Built for both sides of the trade
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed max-w-2xl mx-auto">
            Whether you're sourcing or supplying, Fincava gives you the tools, trust, and connections to move.
          </p>
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── For Buyers ── */}
          <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-8 flex flex-col">
            {/* Column header */}
            <div className="mb-7">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-sky-600 mb-3">
                For Buyers
              </span>
              <h3 className="text-2xl font-serif font-bold leading-snug mb-3">
                Source premium Colombian goods with confidence.
              </h3>
              <p className="text-sky-800/60 text-sm leading-relaxed">
                Every supplier on Fincava is verified. Every document is in order before your goods leave Colombia.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-3 flex-1 mb-8">
              {BUYER_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-start gap-4 p-4 rounded-xl border border-sky-200 bg-white hover:border-sky-300 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-0.5 text-gray-900">{label}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 h-11 px-5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                Browse Marketplace <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex-1 h-11 px-5 rounded-lg border border-sky-300 bg-white text-sky-700 text-sm font-semibold hover:bg-sky-50 transition-colors">
                Post an RFQ
              </button>
            </div>
          </div>

          {/* ── For Suppliers ── */}
          <div className="rounded-2xl border-2 border-[#16a34a]/30 bg-[#16a34a]/5 p-8 flex flex-col">
            {/* Column header */}
            <div className="mb-7">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#16a34a] mb-3">
                For Suppliers
              </span>
              <h3 className="text-2xl font-serif font-bold leading-snug mb-3">
                Reach global buyers. Keep your margin.
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Stop selling through brokers who take 60–80% of your value. Get a direct channel to buyers across target markets.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-3 flex-1 mb-8">
              {SUPPLIER_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-start gap-4 p-4 rounded-xl border border-[#16a34a]/20 bg-white hover:border-[#16a34a]/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#16a34a]/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#16a34a]" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-0.5 text-gray-900">{label}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}

              {/* Shared benefit highlight */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-[#16a34a]/20 bg-[#16a34a]/5">
                <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
                <span className="text-sm text-gray-700 font-medium">No land collateral required for financing</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 h-11 px-5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                Apply to Join <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex-1 h-11 px-5 rounded-lg border border-[#16a34a]/30 bg-white text-[#16a34a] text-sm font-semibold hover:bg-[#16a34a]/5 transition-colors">
                See Our Producers
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
