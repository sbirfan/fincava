import { useGetPlatformStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, Globe, Landmark, Truck, ShieldCheck,
  MapPin, Users, Package, Sprout, CheckCircle2,
  FileText, BarChart3, Search, Banknote, Star,
  ChevronRight,
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

const inView = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

function SectionLabel({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span className={`inline-block text-xs font-semibold uppercase tracking-[0.18em] mb-4 ${light ? "text-white/40" : "text-primary"}`}>
      {children}
    </span>
  );
}

const PRODUCTS = [
  { name: "Specialty Coffee", origin: "Huila · Nariño · Cauca", icon: "☕", tag: "Most Traded" },
  { name: "Fine Cacao", origin: "Tumaco · Arauca", icon: "🍫", tag: "High Demand" },
  { name: "Hass Avocado", origin: "Antioquia · Eje Cafetero", icon: "🥑", tag: "Export Ready" },
  { name: "Exotic Fruits", origin: "Valle del Cauca", icon: "🍍", tag: "Premium" },
  { name: "Superfoods", origin: "Boyacá · Cundinamarca", icon: "🌿", tag: "Growing" },
  { name: "Quinoa & Grains", origin: "Nariño · Cauca", icon: "🌾", tag: "Certified" },
];

export default function Home() {
  const { data: stats } = useGetPlatformStats();

  return (
    <div className="flex-1 flex flex-col overflow-x-hidden">

      {/* ─── 1. HERO ──────────────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#050f0a]">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero.png"
            alt="Colombian agricultural landscape"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050f0a]/60 via-[#050f0a]/20 to-[#050f0a]" />
        </div>
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
            Colombia meets the world
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-7xl lg:text-[80px] font-serif font-bold leading-[1.06] tracking-tight mb-8"
          >
            Colombia's best producers.<br />
            <span className="text-primary">The world's best buyers.</span><br />
            One platform.
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-xl md:text-2xl max-w-2xl mx-auto mb-12 text-white/60 font-light leading-relaxed"
          >
            Fincava connects verified Colombian agricultural producers with global buyers — with embedded finance, compliance documentation, and distribution built in.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-base font-semibold rounded-lg">
                Start Buying <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/8 h-14 px-8 text-base font-semibold rounded-lg bg-transparent">
                Join as a Supplier
              </Button>
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden border border-white/10 max-w-3xl mx-auto"
          >
            {[
              { value: stats?.verifiedSuppliers || "12+", label: "Verified Producers" },
              { value: stats?.totalProducts || "40+", label: "Export Products" },
              { value: "15+", label: "Countries Reached" },
              { value: "$4.2M+", label: "Trade Facilitated" },
            ].map(m => (
              <div key={m.label} className="bg-white/[0.04] px-6 py-5 text-center">
                <div className="text-2xl font-bold text-white mb-0.5">{m.value}</div>
                <div className="text-xs text-white/40">{m.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
      </section>

      {/* ─── 2. THE PROBLEM (TWO SIDES) ───────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <SectionLabel>The Problem</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-5">
              Global trade is broken for both sides.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Buyers can't find verified, traceable supply. Producers can't reach the buyers who need them. Fincava fixes both.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Buyers side */}
            <motion.div
              variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="p-8 rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                  <Search className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-sky-500 mb-0.5">For Buyers</div>
                  <h3 className="font-serif font-bold text-lg">Finding reliable supply is a guessing game</h3>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "No way to verify producer quality or certifications without flying there",
                  "Compliance documentation arrives incomplete or too late",
                  "4–6 broker layers obscure origin and inflate cost",
                  "No shipment visibility once goods leave the farm",
                  "No single counterparty to hold accountable end-to-end",
                ].map(p => (
                  <li key={p} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-2" />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Suppliers side */}
            <motion.div
              variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="p-8 rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sprout className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-0.5">For Suppliers</div>
                  <h3 className="font-serif font-bold text-lg">Reaching global buyers is nearly impossible</h3>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "No direct channel to reach buyers in the Middle East, Asia, or Europe",
                  "Traditional banks won't finance agricultural trade without heavy collateral",
                  "Producers capture less than 5% of end consumer value",
                  "Every sale goes through 4–6 extractive intermediary layers",
                  "No infrastructure to present certifications, origin, or traceability",
                ].map(p => (
                  <li key={p} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-2" />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 3. HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="py-28 bg-[#050f0a] text-white overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-20">
            <SectionLabel light>How It Works</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
              Three layers. One seamless trade.
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">
              Every trade on Fincava moves through three integrated layers — from finding each other to getting paid to receiving your goods.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: Globe,
                title: "Market Access",
                color: "from-primary/20 to-primary/5",
                border: "border-primary/30",
                badge: "bg-primary/20 text-primary",
                buyerValue: "Browse verified Colombian producers. Post an RFQ and receive competitive quotes within 48 hours.",
                supplierValue: "List your products, certifications, and origin story. Get discovered by vetted international buyers.",
                capabilities: ["Verified producer profiles", "RFQ & bidding engine", "Compliance documentation", "Origin traceability"],
              },
              {
                step: "02",
                icon: Landmark,
                title: "Embedded Finance",
                color: "from-amber-500/20 to-amber-500/5",
                border: "border-amber-500/30",
                badge: "bg-amber-500/20 text-amber-400",
                buyerValue: "Pay on milestones with escrow protection. FX handled. No surprise fees.",
                supplierValue: "Access trade credit against your orders. Get financed before shipment arrives.",
                capabilities: ["Milestone payment escrow", "Trade credit lines", "FX facilitation", "Invoice factoring"],
              },
              {
                step: "03",
                icon: Truck,
                title: "Distribution",
                color: "from-sky-500/20 to-sky-500/5",
                border: "border-sky-500/30",
                badge: "bg-sky-500/20 text-sky-400",
                buyerValue: "Real-time tracking from farm gate to your port. Customs pre-clearance included.",
                supplierValue: "Logistics partners coordinated for you. Cold chain, port clearance, last-mile handled.",
                capabilities: ["Shipment tracking", "Cold-chain coordination", "Customs pre-clearance", "Logistics intelligence"],
              },
            ].map(l => (
              <motion.div
                key={l.title}
                variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className={`relative p-8 rounded-2xl border ${l.border} bg-gradient-to-b ${l.color} flex flex-col`}
              >
                <div className={`inline-flex items-center gap-2 ${l.badge} text-xs font-semibold px-3 py-1 rounded-full mb-6 w-fit`}>
                  Step {l.step}
                </div>
                <l.icon className="w-8 h-8 mb-4 text-white/60" />
                <h3 className="text-xl font-serif font-bold mb-5">{l.title}</h3>
                <div className="space-y-3 mb-6 flex-1">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 mb-1">Buyers</div>
                    <p className="text-white/60 text-xs leading-relaxed">{l.buyerValue}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Suppliers</div>
                    <p className="text-white/60 text-xs leading-relaxed">{l.supplierValue}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 border-t border-white/10 pt-4">
                  {l.capabilities.map(c => (
                    <li key={c} className="flex items-center gap-2 text-xs text-white/50">
                      <CheckCircle2 className="w-3 h-3 text-white/25 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. FOR BUYERS ────────────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <SectionLabel>For Buyers</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                Source premium Colombian goods with confidence.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Every supplier on Fincava is verified. Every shipment is tracked. Every document is in order before your goods leave Colombia.
              </p>
              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, label: "Verified Producers", desc: "Every supplier is screened, certified, and quality-reviewed before listing on the platform." },
                  { icon: FileText, label: "Compliance Ready", desc: "Origin certificates, phytosanitary docs, and customs paperwork — prepared for your destination market." },
                  { icon: BarChart3, label: "Real-Time Tracking", desc: "Follow your shipment from farm gate to your port. Live milestones, no black boxes." },
                  { icon: Globe, label: "Competitive Sourcing", desc: "Post an RFQ and receive quotes from multiple verified Colombian producers within 48 hours." },
                ].map(f => (
                  <div key={f.label} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1 text-sm">{f.label}</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-8">
                <Link href="/marketplace">
                  <Button className="bg-primary hover:bg-primary/90">
                    Browse Marketplace <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/rfqs">
                  <Button variant="outline">Post an RFQ</Button>
                </Link>
              </div>
            </motion.div>

            {/* Buyer visual */}
            <motion.div
              variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Active Sourcing</span>
                  <span className="text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full font-medium">Live</span>
                </div>
                {[
                  { product: "Specialty Coffee — Washed", origin: "Huila, Colombia", qty: "5,000 kg", status: "Quote received", color: "text-primary bg-primary/10" },
                  { product: "Fine Cacao — Fermented", origin: "Tumaco, Colombia", qty: "2,000 kg", status: "In transit", color: "text-sky-600 bg-sky-50" },
                  { product: "Hass Avocado — Grade A", origin: "Antioquia, Colombia", qty: "8,000 kg", status: "Delivered", color: "text-emerald-600 bg-emerald-50" },
                ].map(o => (
                  <div key={o.product} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
                    <div>
                      <div className="font-medium text-sm">{o.product}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> {o.origin} · {o.qty}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${o.color}`}>{o.status}</span>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                  {[
                    { label: "Avg lead time", value: "14 days" },
                    { label: "Docs complete", value: "100%" },
                    { label: "Satisfaction", value: "4.9 ★" },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className="text-base font-bold">{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 5. FOR SUPPLIERS ─────────────────────────────────────────────── */}
      <section className="py-28 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Supplier visual — left side */}
            <motion.div
              variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="relative order-2 lg:order-1"
            >
              <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Your Global Reach</span>
                  <span className="text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full font-medium">Live orders</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { flag: "🇸🇦", market: "Saudi Arabia", orders: "3 active" },
                    { flag: "🇯🇵", market: "Japan", orders: "1 active" },
                    { flag: "🇰🇷", market: "South Korea", orders: "2 active" },
                    { flag: "🇦🇪", market: "UAE", orders: "4 active" },
                    { flag: "🇸🇬", market: "Singapore", orders: "1 active" },
                    { flag: "🇳🇱", market: "Netherlands", orders: "2 active" },
                  ].map(m => (
                    <div key={m.market} className="p-3 rounded-xl border border-border bg-card text-center">
                      <div className="text-xl mb-1">{m.flag}</div>
                      <div className="text-xs font-medium leading-tight">{m.market}</div>
                      <div className="text-[10px] text-primary mt-0.5">{m.orders}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-primary/8 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Trade Finance</span>
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Available now</span>
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">$28,000</div>
                  <div className="text-xs text-muted-foreground">Pre-shipment credit against confirmed orders</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <SectionLabel>For Suppliers</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                Reach global buyers. Get paid. Keep your margin.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Stop selling through brokers who take 60–80% of your value. Fincava gives Colombian producers a direct channel to buyers in 15+ countries — with financing to grow and logistics to deliver.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Globe, label: "Global Buyer Network", desc: "Access vetted importers, distributors, and retail buyers across the Middle East, Asia, Europe, and North America." },
                  { icon: Banknote, label: "Trade Finance Access", desc: "Get credit against confirmed purchase orders — no land collateral required. Capital that follows your orders." },
                  { icon: Truck, label: "Logistics Handled", desc: "We coordinate cold chain, port clearance, and freight forwarding so you focus on growing and harvesting." },
                  { icon: Star, label: "Your Story, Professionally Presented", desc: "Origin documentation, certifications, and your farm's story — presented to buyers in a format they trust." },
                ].map(f => (
                  <div key={f.label} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-background hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1 text-sm">{f.label}</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-8">
                <Link href="/register">
                  <Button className="bg-primary hover:bg-primary/90">
                    Apply to Join <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/suppliers">
                  <Button variant="outline">See Our Producers</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 6. SOCIAL PROOF ──────────────────────────────────────────────── */}
      <section className="py-28 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel light>Real Traction</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                Real producers. Real buyers. Real trade.
              </h2>
              <p className="text-primary-foreground/70 text-lg leading-relaxed mb-8">
                Fincava is not a concept. We have verified producer relationships, live order flow, and trade data across Colombia's top agricultural regions.
              </p>
              <div className="space-y-3">
                {[
                  "12+ verified Colombian producers across coffee, cacao, and superfoods",
                  "Active buyers in Saudi Arabia, Japan, South Korea, UAE, and the Netherlands",
                  "Origin story documentation covering 85+ farming families across 8 regions",
                  "Live RFQ, order, and shipment tracking processing real trade flows",
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
                { value: "$4.2M+", label: "Trade Facilitated", icon: BarChart3 },
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

      {/* ─── 7. PRODUCT PREVIEW ───────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <SectionLabel>What We Trade</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-5">
              Colombia's finest, export-ready.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              From specialty coffee to exotic superfoods — every product on Fincava is verified, traceable, and export-ready.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            {PRODUCTS.map(p => (
              <motion.div
                key={p.name}
                variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors group cursor-pointer"
              >
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-serif font-bold mb-1">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {p.origin}
                </p>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {p.tag}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/marketplace">
              <Button size="lg" variant="outline" className="h-12 px-8">
                Browse Full Marketplace <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 8. DUAL CTA ──────────────────────────────────────────────────── */}
      <section className="py-28 bg-card border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-14">
            <SectionLabel>Get Started</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-5">
              Which side of the trade are you on?
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              Join the platform built for both sides of Colombian agricultural trade. Registration takes five minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buyer CTA */}
            <div className="p-8 rounded-2xl border-2 border-sky-200 bg-sky-50 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-5">
                <Search className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-3">I'm a Buyer</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">
                Source premium, verified Colombian agricultural products with full traceability, compliance docs, and end-to-end logistics support.
              </p>
              <ul className="space-y-2 mb-8">
                {["Access verified Colombian producers", "Request quotes via RFQ engine", "Full compliance documentation", "Real-time shipment tracking"].map(b => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white h-12">
                  Register as a Buyer <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Supplier CTA */}
            <div className="p-8 rounded-2xl border-2 border-primary/30 bg-primary/5 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-5">
                <Sprout className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-3">I'm a Supplier</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">
                Connect directly with international buyers, access trade financing, and export your products to 15+ countries — without intermediaries.
              </p>
              <ul className="space-y-2 mb-8">
                {["Reach buyers in 15+ countries", "Trade finance on your orders", "Logistics fully coordinated", "Keep more of your margin"].map(b => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full bg-primary hover:bg-primary/90 h-12">
                  Join as a Supplier <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Questions? <Link href="/contact"><span className="text-primary hover:underline cursor-pointer">Talk to our team →</span></Link>
          </p>
        </div>
      </section>

    </div>
  );
}
