import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  TrendingUp, DollarSign, Globe, Users, BarChart2,
  ArrowRight, CheckCircle2, Layers, Shield, Cpu,
  Network, Scale, Landmark, Package, MapPin,
  Building2, Zap, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};
const stagger = { show: { transition: { staggerChildren: 0.12 } } };

function SectionLabel({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span className={`inline-block text-xs font-semibold uppercase tracking-[0.18em] mb-4 ${light ? "text-white/40" : "text-primary"}`}>
      {children}
    </span>
  );
}

const METRICS = [
  { label: "Addressable Market", value: "$180B", sub: "Annual LatAm agri-exports to MENA + Asia" },
  { label: "Underserved Producers", value: "800K+", sub: "Colombian smallholder farms with no export access" },
  { label: "Financing Gap", value: "$2.1B", sub: "Unmet trade finance in Colombian agri-sector" },
  { label: "Dastgyr Parallel", value: "$500M", sub: "Validated in Pakistani market (Series B 2023)" },
];

const TRACTION = [
  "12+ verified producer relationships across 8 Colombian departments",
  "3 export-ready supplier companies onboarded",
  "8 product categories with full origin story documentation",
  "Live RFQ, order, and inquiry infrastructure processing real trade",
  "$4.2M+ in trade facilitated across buyer-producer pairs",
  "85+ farming families supported through direct-trade pricing",
];

const TEAM = [
  {
    name: "Founding Team",
    role: "Colombia-based operators with export, fintech, and trade experience",
    detail: "Deep relationships across producer cooperatives, freight operators, and export certification bodies.",
  },
  {
    name: "Advisory Board",
    role: "International trade, agri-finance, and emerging market tech",
    detail: "Advisors with experience at Dastgyr, Twiga, Agrocorp, and LatAm agri-export organizations.",
  },
  {
    name: "Technical Infrastructure",
    role: "Full-stack trade platform, live in production",
    detail: "Not a deck. A working Commerce OS with live order flow, RFQs, producer stories, and real data.",
  },
];

export default function Investors() {
  return (
    <div className="bg-background">

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="py-24 text-center border-b bg-[#050f0a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="container mx-auto px-4 max-w-4xl relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="outline" className="mb-6 border-primary/40 text-primary bg-primary/10">Investor Relations</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6 leading-tight">
              Building the Operating System<br />
              <span className="text-primary">for Emerging Market Commerce.</span>
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
              Fincava is the infrastructure layer connecting Colombian agricultural producers to $180B in annual demand across the Middle East, Asia, and Africa, with embedded finance, distribution, and compliance built in.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/contact">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Request Deck <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/platform">
                <Button size="lg" variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10">
                  View Platform
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── MARKET METRICS ───────────────────────────────────────────────── */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">The Market Opportunity</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Three converging forces: Colombia's production surplus, MENA/Asia demand explosion, and broken B2B infrastructure, creating a structural arbitrage opportunity.</p>
        </div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {METRICS.map(m => (
            <motion.div key={m.label} variants={fadeUp}>
              <Card className="text-center h-full">
                <CardContent className="pt-8 pb-6">
                  <p className="text-4xl font-bold text-primary mb-2">{m.value}</p>
                  <p className="font-semibold text-sm mb-2">{m.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{m.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── TRACTION ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-primary-foreground/30 text-primary-foreground">Ground-Level Traction</Badge>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">Not projections. Real trade, real relationships.</h2>
              <p className="text-primary-foreground/80 leading-relaxed">
                Fincava has been built from the ground up with producer relationships, not from a spreadsheet. We have verified supplier integrations, live order flow, and real data on prices, volumes, and demand signals.
              </p>
            </div>
            <ul className="space-y-3">
              {TRACTION.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-primary-foreground/80" />
                  <span className="text-primary-foreground/90 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── WHY NOW ──────────────────────────────────────────────────────── */}
      <section className="py-24 bg-background">
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
                body: "Dastgyr (Pakistan) built a $500M commerce infrastructure business in 3 years by digitizing the same broken supply chain dynamics. The model is validated. Colombia is structurally identical but earlier stage, with higher product value floors.",
                highlight: "$500M validated playbook",
              },
              {
                number: "03",
                icon: Globe,
                title: "Emerging Market Demand Surge",
                body: "The Middle East, Asia, and Africa are importing $180B in agricultural commodities annually, with growing preference for traceability and direct sourcing. Traditional brokers cannot provide what modern buyers demand. Fincava can.",
                highlight: "$180B annual import market",
              },
            ].map(r => (
              <motion.div
                key={r.number}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="relative p-8 rounded-2xl border border-border bg-card"
              >
                <div className="text-6xl font-bold text-border mb-6 select-none leading-none">{r.number}</div>
                <r.icon className="w-7 h-7 text-primary mb-4" />
                <h3 className="text-xl font-serif font-bold mb-3">{r.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{r.body}</p>
                <div className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full inline-block">
                  {r.highlight}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ARCHITECTURE ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel>Architecture</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                Built as a modular<br />agentic system.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Every component of Fincava is a discrete, composable service. AI agents coordinate across layers in real time, matching supply to demand, triggering financing events, and managing compliance without human bottlenecks.
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
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {["Buyer App", "Supplier App", "Admin Console"].map(n => (
                    <div key={n} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center text-white/60 text-xs">{n}</div>
                  ))}
                </div>
                <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 text-center text-primary text-xs font-semibold mb-4">
                  Fincava API Gateway
                </div>
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
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Market Access", color: "bg-primary/10 border-primary/20 text-primary/70" },
                    { label: "Embedded Finance", color: "bg-amber-500/10 border-amber-500/20 text-amber-400/70" },
                    { label: "Distribution", color: "bg-sky-500/10 border-sky-500/20 text-sky-400/70" },
                  ].map(s => (
                    <div key={s.label} className={`border rounded-lg px-2 py-3 text-center text-[11px] ${s.color}`}>{s.label}</div>
                  ))}
                </div>
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

      {/* ─── BUSINESS MODEL ───────────────────────────────────────────────── */}
      <section className="py-24 bg-background">
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
                note: "Highest margin layer, unlocked at scale",
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
                note: "Platform flywheel, activates at network depth",
              },
            ].map(m => (
              <motion.div
                key={m.title}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className={`p-8 rounded-2xl border ${m.color} flex flex-col`}
              >
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
              </motion.div>
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
          <div className="text-center mt-6 text-sm text-muted-foreground">
            Unit economics: a single $50K order generates ~$1,500 transaction revenue + up to $3,600 in financing fees if financed at 18% for 6 months.
          </div>
        </div>
      </section>

      {/* ─── COMPETITIVE ADVANTAGE ────────────────────────────────────────── */}
      <section className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <SectionLabel>Why Fincava Wins</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                Advantages that compound. Moats that deepen over time.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Fincava's competitive position is not a single feature; it is the combination of local depth, architectural superiority, and execution timing that creates durable defensibility.
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
                  body: "Every transaction enriches our risk models, demand signals, and logistics intelligence. The platform gets stronger with each trade, creating compounding advantages over later entrants.",
                },
                {
                  icon: Building2,
                  title: "Regulatory & Compliance Moat",
                  body: "International trade compliance is complex and relationship-dependent. Our pre-built compliance workflows, documentation standards, and regulatory relationships are years of work to replicate.",
                },
              ].map(a => (
                <motion.div
                  key={a.title}
                  variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                  className="flex items-start gap-4 p-5 rounded-xl border border-border bg-background hover:border-primary/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <a.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold mb-1">{a.title}</div>
                    <div className="text-sm text-muted-foreground leading-relaxed">{a.body}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── THE VISION ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#050f0a] text-white text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative container mx-auto px-4 max-w-4xl">
          <SectionLabel light>The Vision</SectionLabel>
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

      {/* ─── TEAM ─────────────────────────────────────────────────────────── */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">The Team</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {TEAM.map(t => (
            <Card key={t.name} className="p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{t.name}</h3>
              <p className="text-xs text-primary font-medium mb-3">{t.role}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 border-t text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary">Connect With Us</Badge>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-5">Interested in backing the infrastructure layer?</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            We're building the Stripe / Dastgyr equivalent for agricultural trade in Latin America. If this thesis resonates, we'd like to talk.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/contact">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Request Investor Deck <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/platform">
              <Button size="lg" variant="outline">Explore Platform</Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
