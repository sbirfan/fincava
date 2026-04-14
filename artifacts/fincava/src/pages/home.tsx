import { useGetPlatformStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, Globe, Landmark, Truck, Cpu, Zap, BarChart3,
  AlertTriangle, Layers, ShieldCheck, TrendingUp, Users,
  MapPin, Building2, Network, DollarSign, Package, Sprout,
  ChevronRight, CheckCircle2, Lock, Scale, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">
      {children}
    </span>
  );
}

export default function Home() {
  const { data: stats } = useGetPlatformStats();

  return (
    <div className="flex-1 flex flex-col overflow-x-hidden">

      {/* ─── 1. HERO ──────────────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#050f0a]">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero.png"
            alt="Colombian agricultural landscape"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050f0a]/60 via-[#050f0a]/20 to-[#050f0a]" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative z-10 container mx-auto px-4 text-center text-white pt-20 pb-32">
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="inline-flex items-center gap-2 bg-white/8 backdrop-blur-sm border border-white/12 rounded-full px-4 py-2 text-sm text-white/70 mb-10"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Infrastructure for Emerging Market Commerce
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-7xl lg:text-[88px] font-serif font-bold leading-[1.04] tracking-tight mb-8"
          >
            The Operating System<br />
            <span className="text-primary">for Emerging Market</span><br />
            Commerce.
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-xl md:text-2xl max-w-3xl mx-auto mb-12 text-white/60 font-light leading-relaxed"
          >
            Fincava unifies market access, embedded finance, and distribution into one infrastructure layer — enabling producers in Colombia to trade at scale with buyers across the Middle East, Asia, and Africa.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-base font-semibold rounded-lg">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/8 h-14 px-8 text-base font-semibold rounded-lg bg-transparent">
                Partner With Us
              </Button>
            </Link>
          </motion.div>

          {/* Metrics bar */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden border border-white/10 max-w-3xl mx-auto"
          >
            {[
              { value: stats?.verifiedSuppliers || "12+", label: "Verified Producers" },
              { value: stats?.totalProducts || "40+", label: "Export Products" },
              { value: "3", label: "System Layers" },
              { value: "$4.2M+", label: "Trade Facilitated" },
            ].map(m => (
              <div key={m.label} className="bg-white/[0.04] px-6 py-5 text-center">
                <div className="text-2xl font-bold text-white mb-0.5">{m.value}</div>
                <div className="text-xs text-white/40">{m.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
      </section>

      {/* ─── 2. PROBLEM ───────────────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16">
            <SectionLabel>The Problem</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
              Emerging markets are trapped by broken infrastructure.
            </h2>
            <p className="text-muted-foreground text-xl leading-relaxed">
              Colombia produces world-class agricultural goods. Yet the systems connecting producers to global demand are fragmented, extractive, and decades behind. Value leaks at every layer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: AlertTriangle,
                label: "Fragmented Supply Chains",
                body: "4–6 intermediary layers sit between the farm and the buyer. Each layer extracts margin, obscures provenance, and adds weeks of lead time. Producers receive less than 5% of end consumer value.",
                stat: "< 5%", statLabel: "value captured by producers",
              },
              {
                icon: Globe,
                label: "No Market Access",
                body: "Smallholder producers and mid-tier exporters cannot access international buyers directly. They lack the infrastructure, credit history, and compliance documentation that global trade requires.",
                stat: "80%", statLabel: "of producers without direct export access",
              },
              {
                icon: Lock,
                label: "Capital Locked Out",
                body: "Traditional banks won't finance agricultural trade without collateral. This creates a vicious cycle: no capital means no growth, no growth means no bankability. Producers are permanently underfinanced.",
                stat: "$2.1B", statLabel: "annual financing gap in Colombian agri-trade",
              },
              {
                icon: Truck,
                label: "Inefficient Distribution",
                body: "Cold-chain gaps, port inefficiency, and fragmented logistics make reliable cross-border delivery nearly impossible for emerging producers. Distribution costs devour what margin survives the supply chain.",
                stat: "40%", statLabel: "of goods lost to logistics inefficiency",
              },
            ].map(p => (
              <div key={p.label} className="relative p-8 border border-border rounded-2xl bg-card hover:border-primary/30 transition-colors group">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <p.icon className="w-6 h-6 text-red-500 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{p.label}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{p.body}</p>
                    <div className="inline-flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
                      <span className="font-bold text-foreground text-sm">{p.stat}</span>
                      <span className="text-muted-foreground text-xs">{p.statLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. SOLUTION — 3 SYSTEM LAYERS ───────────────────────────────── */}
      <section className="py-28 bg-[#050f0a] text-white overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <SectionLabel>The Solution</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
              One system. Three layers.<br />Complete infrastructure.
            </h2>
            <p className="text-white/60 text-xl leading-relaxed">
              Fincava is not a feature — it is the unified operating layer that connects every element of emerging market commerce into a coherent, scalable system.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                layer: "Layer 01",
                icon: Globe,
                title: "Market Access",
                color: "from-primary/20 to-primary/5",
                border: "border-primary/30",
                badge: "bg-primary/20 text-primary",
                capabilities: [
                  "Verified producer network",
                  "Demand-signal matching",
                  "RFQ + bidding engine",
                  "Compliance documentation",
                  "Origin story & traceability",
                ],
                body: "We remove every layer between producer and buyer. Verified suppliers, real-time demand signals, and structured RFQ workflows create direct, compliant, traceable trade at scale.",
              },
              {
                layer: "Layer 02",
                icon: Landmark,
                title: "Embedded Finance",
                color: "from-amber-500/20 to-amber-500/5",
                border: "border-amber-500/30",
                badge: "bg-amber-500/20 text-amber-400",
                capabilities: [
                  "Trade finance & credit lines",
                  "Payment milestone escrow",
                  "Foreign exchange facilitation",
                  "Invoice factoring",
                  "Risk scoring by transaction",
                ],
                body: "Capital should follow commerce, not block it. Fincava's financial layer provides the credit infrastructure that emerging market producers need to compete on the global stage.",
              },
              {
                layer: "Layer 03",
                icon: Truck,
                title: "Distribution",
                color: "from-sky-500/20 to-sky-500/5",
                border: "border-sky-500/30",
                badge: "bg-sky-500/20 text-sky-400",
                capabilities: [
                  "Shipment tracking & milestones",
                  "Cold-chain coordination",
                  "Port & customs pre-clearance",
                  "Last-mile network integration",
                  "Logistics intelligence",
                ],
                body: "End-to-end visibility from farm gate to port of destination. Real-time tracking, automated milestone triggers, and pre-integrated logistics partners make reliable delivery the default.",
              },
            ].map(l => (
              <div key={l.title} className={`relative p-8 rounded-2xl border ${l.border} bg-gradient-to-b ${l.color} flex flex-col`}>
                <div className={`inline-flex items-center gap-2 ${l.badge} text-xs font-semibold px-3 py-1 rounded-full mb-6 w-fit`}>
                  {l.layer}
                </div>
                <l.icon className="w-8 h-8 mb-4 text-white/60" />
                <h3 className="text-2xl font-serif font-bold mb-3">{l.title} Layer</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-6 flex-1">{l.body}</p>
                <ul className="space-y-2">
                  {l.capabilities.map(c => (
                    <li key={c} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* System connector visual */}
          <div className="mt-12 flex items-center justify-center gap-4 text-white/30 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Market Access</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-primary/30 via-white/10 to-amber-500/30 max-w-48" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Finance</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 via-white/10 to-sky-500/30 max-w-48" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-500" />
              <span>Distribution</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. ARCHITECTURE ──────────────────────────────────────────────── */}
      <section className="py-28 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel>Architecture</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                Built as a modular<br />agentic system.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Every component of Fincava is a discrete, composable service. AI agents coordinate across layers in real time — matching supply to demand, triggering financing events, and managing compliance — without human bottlenecks.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Cpu, label: "AI-Driven Agents", desc: "Autonomous agents match RFQs to suppliers, score trust, and flag compliance risks in real time." },
                  { icon: Network, label: "Modular Services", desc: "Each system layer (market, finance, distribution) operates independently and composes via clean APIs." },
                  { icon: Scale, label: "Scalable by Design", desc: "Built to serve 10 producers or 10,000. The architecture scales horizontally without rearchitecting." },
                ].map(f => (
                  <div key={f.label} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-background hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">{f.label}</div>
                      <div className="text-sm text-muted-foreground">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture diagram */}
            <div className="relative">
              <div className="bg-[#050f0a] rounded-2xl p-8 border border-white/10 font-mono text-sm">
                <div className="text-white/30 text-xs mb-6">// Fincava System Architecture</div>

                {/* Top layer */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {["Buyer App", "Supplier App", "Admin Console"].map(n => (
                    <div key={n} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center text-white/60 text-xs">{n}</div>
                  ))}
                </div>

                {/* API Layer */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 text-center text-primary text-xs font-semibold mb-4">
                  Fincava API Gateway
                </div>

                {/* Agent layer */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Match Agent", color: "text-primary border-primary/20 bg-primary/5" },
                    { label: "Finance Agent", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
                    { label: "Logistics Agent", color: "text-sky-400 border-sky-500/20 bg-sky-500/5" },
                  ].map(a => (
                    <div key={a.label} className={`border rounded-lg px-2 py-2.5 text-center text-xs font-medium ${a.color}`}>
                      {a.label}
                    </div>
                  ))}
                </div>

                {/* Service layer */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Market Access", color: "bg-primary/10 border-primary/20 text-primary/70" },
                    { label: "Embedded Finance", color: "bg-amber-500/10 border-amber-500/20 text-amber-400/70" },
                    { label: "Distribution", color: "bg-sky-500/10 border-sky-500/20 text-sky-400/70" },
                  ].map(s => (
                    <div key={s.label} className={`border rounded-lg px-2 py-3 text-center text-[11px] ${s.color}`}>{s.label}</div>
                  ))}
                </div>

                {/* Database */}
                <div className="bg-white/3 border border-white/8 rounded-lg px-4 py-2.5 text-center text-white/30 text-xs">
                  PostgreSQL · Event Store · Analytics DB
                </div>

                <div className="mt-4 flex items-center justify-between text-[10px] text-white/20">
                  <span>← Market layer</span>
                  <span>Real-time sync →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. WHY NOW ───────────────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <SectionLabel>Why Now</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
              The window is open — and it won't stay open long.
            </h2>
            <p className="text-muted-foreground text-xl leading-relaxed">
              Three converging forces make this the precise moment to build commerce infrastructure for emerging markets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: "01",
                icon: TrendingUp,
                title: "Colombia's Export Moment",
                body: "Colombia is the world's 3rd largest coffee producer and rapidly expanding specialty exports. Premium demand from the Middle East, Japan, and South Korea is growing 22% YoY. The infrastructure to capture that demand doesn't exist yet.",
                highlight: "22% YoY demand growth",
              },
              {
                number: "02",
                icon: Zap,
                title: "Proven in Adjacent Markets",
                body: "Dastgyr (Pakistan) built a $500M commerce infrastructure business in 3 years by digitizing the same broken supply chain dynamics. The model is validated. Colombia is structurally identical but earlier stage — with higher product value floors.",
                highlight: "$500M validated playbook",
              },
              {
                number: "03",
                icon: Globe,
                title: "Emerging Market Demand Surge",
                body: "The Middle East, Asia, and Africa are importing $180B in agricultural commodities annually — with growing preference for traceability and direct sourcing. Traditional brokers cannot provide what modern buyers demand. Fincava can.",
                highlight: "$180B annual import market",
              },
            ].map(r => (
              <div key={r.number} className="relative p-8 rounded-2xl border border-border bg-card">
                <div className="text-6xl font-bold text-border mb-6 select-none leading-none">{r.number}</div>
                <r.icon className="w-7 h-7 text-primary mb-4" />
                <h3 className="text-xl font-serif font-bold mb-3">{r.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{r.body}</p>
                <div className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full inline-block">
                  {r.highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. TRACTION ──────────────────────────────────────────────────── */}
      <section className="py-28 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel>Traction & Insight</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                Built from the ground up — not from a spreadsheet.
              </h2>
              <p className="text-primary-foreground/70 text-lg leading-relaxed mb-8">
                Fincava is not a theoretical platform. It was designed from direct relationships with Colombian producers, exporters, and logistics operators — the people who live the inefficiencies every day.
              </p>
              <div className="space-y-4">
                {[
                  "Active relationships with 12+ verified Colombian producers across coffee, cacao, and superfoods",
                  "Live RFQ, order, and shipment tracking infrastructure processing real trade flows",
                  "Origin story system capturing farm-level data across 8+ regions, 85+ families",
                  "Direct market intelligence from export operators in Huila, Tumaco, Antioquia, and Boyacá",
                ].map(t => (
                  <div key={t} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-foreground/60 shrink-0 mt-0.5" />
                    <span className="text-primary-foreground/80 text-sm leading-relaxed">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "12+", label: "Verified Producers", icon: ShieldCheck },
                { value: "8", label: "Colombian Regions", icon: MapPin },
                { value: "85+", label: "Farming Families", icon: Users },
                { value: "100%", label: "Live, Real Trade Data", icon: BarChart3 },
              ].map(s => (
                <div key={s.label} className="bg-primary-foreground/10 rounded-2xl p-6 border border-primary-foreground/10">
                  <s.icon className="w-6 h-6 text-primary-foreground/50 mb-3" />
                  <div className="text-3xl font-bold mb-1">{s.value}</div>
                  <div className="text-primary-foreground/60 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. BUSINESS MODEL ────────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <SectionLabel>Business Model</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
              Multi-layer revenue that compounds with scale.
            </h2>
            <p className="text-muted-foreground text-xl leading-relaxed">
              Each system layer generates its own revenue stream. As volume grows, margin compounds across all three simultaneously.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: DollarSign,
                title: "Transaction Margin",
                tier: "Core Revenue",
                color: "border-primary/30 bg-primary/5",
                iconColor: "text-primary bg-primary/10",
                items: [
                  "2–4% on each trade transaction",
                  "Scales directly with GMV",
                  "Immediate from day one",
                  "No inventory risk",
                ],
                note: "Revenue activates with first transaction",
              },
              {
                icon: Landmark,
                title: "Trade Financing",
                tier: "High Margin",
                color: "border-amber-500/30 bg-amber-500/5",
                iconColor: "text-amber-600 bg-amber-500/10",
                items: [
                  "8–18% APR on trade credit",
                  "Secured by trade receivables",
                  "Risk scored per transaction",
                  "Scales with producer creditworthiness",
                ],
                note: "Highest margin layer — unlocked at scale",
              },
              {
                icon: Package,
                title: "Platform Services",
                tier: "Future Layer",
                color: "border-sky-500/30 bg-sky-500/5",
                iconColor: "text-sky-600 bg-sky-500/10",
                items: [
                  "SaaS subscriptions for exporters",
                  "Compliance-as-a-service",
                  "Analytics & market intelligence",
                  "White-label infrastructure licensing",
                ],
                note: "Platform flywheel — activates at network depth",
              },
            ].map(m => (
              <div key={m.title} className={`p-8 rounded-2xl border ${m.color} flex flex-col`}>
                <div className={`w-12 h-12 rounded-xl ${m.iconColor} flex items-center justify-center mb-4`}>
                  <m.icon className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{m.tier}</div>
                <h3 className="text-xl font-serif font-bold mb-4">{m.title}</h3>
                <ul className="space-y-2 flex-1 mb-6">
                  {m.items.map(i => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      {i}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border">
                  {m.note}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { value: "2–4%", label: "Transaction take rate", sublabel: "on every trade" },
              { value: "8–18%", label: "Financing APR", sublabel: "on extended credit" },
              { value: "3x", label: "Revenue per account", sublabel: "across all layers" },
            ].map(s => (
              <div key={s.label}>
                <div className="text-4xl font-bold text-primary mb-2">{s.value}</div>
                <div className="font-semibold mb-1">{s.label}</div>
                <div className="text-sm text-muted-foreground">{s.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. COMPETITIVE ADVANTAGE ─────────────────────────────────────── */}
      <section className="py-28 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <SectionLabel>Why Fincava Wins</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                Advantages that compound. Moats that deepen over time.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Fincava's competitive position is not a single feature — it is the combination of local depth, architectural superiority, and execution timing that creates durable defensibility.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: MapPin,
                  title: "Local Ecosystem Depth",
                  body: "We have ground-level producer relationships that a well-funded competitor cannot purchase. Trust is earned through presence, and we are present.",
                },
                {
                  icon: Layers,
                  title: "Unified Architecture Advantage",
                  body: "Most competitors operate in a single layer (marketplace OR finance OR logistics). Fincava operates across all three, creating cross-layer network effects and switching costs.",
                },
                {
                  icon: TrendingUp,
                  title: "Data Flywheel",
                  body: "Every transaction enriches our risk models, demand signals, and logistics intelligence. The platform gets stronger with each trade — creating compounding advantages over later entrants.",
                },
                {
                  icon: Building2,
                  title: "Regulatory & Compliance Moat",
                  body: "International trade compliance is complex and relationship-dependent. Our pre-built compliance workflows, documentation standards, and regulatory relationships are years of work to replicate.",
                },
              ].map(a => (
                <div key={a.title} className="flex items-start gap-4 p-5 rounded-xl border border-border bg-background hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <a.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold mb-1">{a.title}</div>
                    <div className="text-sm text-muted-foreground leading-relaxed">{a.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. VISION ────────────────────────────────────────────────────── */}
      <section className="py-28 bg-[#050f0a] text-white text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative container mx-auto px-4 max-w-4xl">
          <SectionLabel>The Vision</SectionLabel>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-[1.06] mb-8">
            Infrastructure for commerce<br />across Latin America.
          </h2>
          <p className="text-white/50 text-xl md:text-2xl leading-relaxed mb-12 max-w-3xl mx-auto">
            Colombia is the proving ground. The same infrastructure that unlocks Colombian agricultural trade is replicable across Peru, Ecuador, Brazil, and every emerging market where producers are underserved and buyers are underconnected.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { flag: "🇨🇴", label: "Colombia", status: "Live", color: "bg-primary/20 text-primary border-primary/30" },
              { flag: "🇵🇪", label: "Peru", status: "2026", color: "bg-white/5 text-white/40 border-white/10" },
              { flag: "🌎", label: "LatAm", status: "Vision", color: "bg-white/3 text-white/25 border-white/5" },
            ].map(m => (
              <div key={m.label} className={`rounded-xl p-4 border text-center ${m.color}`}>
                <div className="text-2xl mb-2">{m.flag}</div>
                <div className="font-semibold text-sm">{m.label}</div>
                <div className="text-xs mt-1 opacity-70">{m.status}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 10. CTA ──────────────────────────────────────────────────────── */}
      <section className="py-28 bg-background border-t border-border">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <SectionLabel>Get Involved</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
            Build the future of commerce<br />with Fincava.
          </h2>
          <p className="text-muted-foreground text-xl leading-relaxed mb-12">
            Whether you are a buyer sourcing premium Colombian goods, a producer seeking global distribution, an investor looking for category-defining infrastructure, or a logistics partner — there is a place for you in this system.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {[
              { label: "Source Products", desc: "Access premium Colombian agricultural exports with full traceability.", href: "/marketplace", cta: "Browse Marketplace" },
              { label: "Become a Supplier", desc: "Join the network. Get access to global buyers and embedded finance.", href: "/register", cta: "Apply to Join" },
              { label: "Partner / Invest", desc: "Explore investment, integration, or strategic partnership opportunities.", href: "/contact", cta: "Get in Touch" },
            ].map(c => (
              <div key={c.label} className="p-6 border border-border rounded-2xl bg-card text-left hover:border-primary/30 transition-colors">
                <h3 className="font-semibold mb-2">{c.label}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{c.desc}</p>
                <Link href={c.href}>
                  <span className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                    {c.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="h-14 px-10 text-base font-semibold bg-primary hover:bg-primary/90">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="h-14 px-10 text-base font-semibold">
                Talk to Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
