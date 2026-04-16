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
import { useLanguage } from "@/contexts/LanguageContext";

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

const LAYER_ICONS = [Globe, Landmark, Truck];
const BUYER_FEATURE_ICONS = [ShieldCheck, FileText, BarChart3, Globe];
const SUPPLIER_FEATURE_ICONS = [Globe, Banknote, Truck, Star];
const TRACTION_STAT_ICONS = [ShieldCheck, MapPin, Users, BarChart3];

const SUPPLIER_MARKETS = [
  { flag: "🇸🇦", market: "Saudi Arabia", orders: "3 active" },
  { flag: "🇯🇵", market: "Japan", orders: "1 active" },
  { flag: "🇰🇷", market: "South Korea", orders: "2 active" },
  { flag: "🇦🇪", market: "UAE", orders: "4 active" },
  { flag: "🇸🇬", market: "Singapore", orders: "1 active" },
  { flag: "🇳🇱", market: "Netherlands", orders: "2 active" },
];

export default function Home() {
  const { data: stats } = useGetPlatformStats();
  const { t } = useLanguage();
  const h = t.home;

  return (
    <div className="flex-1 flex flex-col overflow-x-hidden">

      {/* ─── 1. HERO ──────────────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#050f0a]">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero.png"
            alt="Colombian agricultural landscape"
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050f0a]/30 via-[#050f0a]/10 to-[#050f0a]" />
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
            {h.hero.badge}
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-7xl lg:text-[80px] font-serif font-bold leading-[1.06] tracking-tight mb-8"
          >
            {h.hero.headline1}<br />
            <span className="text-primary">{h.hero.headline2}</span><br />
            {h.hero.headline3}
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-xl md:text-2xl max-w-2xl mx-auto mb-12 text-white/60 font-light leading-relaxed"
          >
            {h.hero.sub}
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-base font-semibold rounded-lg">
                {h.hero.ctaBuy} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/8 h-14 px-8 text-base font-semibold rounded-lg bg-transparent">
                {h.hero.ctaSupply}
              </Button>
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden border border-white/10 max-w-3xl mx-auto"
          >
            {[
              { value: stats?.verifiedSuppliers || "12+", label: h.hero.stats.producers },
              { value: stats?.totalProducts || "40+", label: h.hero.stats.products },
              { value: "15+", label: h.hero.stats.countries },
              { value: "$4.2M+", label: h.hero.stats.trade },
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

      {/* ─── 2. THE PROBLEM ───────────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <SectionLabel>{h.problem.label}</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-5">
              {h.problem.heading}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{h.problem.sub}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="p-8 rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                  <Search className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-sky-500 mb-0.5">{h.problem.buyersLabel}</div>
                  <h3 className="font-serif font-bold text-lg">{h.problem.buyersHeading}</h3>
                </div>
              </div>
              <ul className="space-y-3">
                {h.problem.buyerProblems.map(p => (
                  <li key={p} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-2" />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="p-8 rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sprout className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-0.5">{h.problem.suppliersLabel}</div>
                  <h3 className="font-serif font-bold text-lg">{h.problem.suppliersHeading}</h3>
                </div>
              </div>
              <ul className="space-y-3">
                {h.problem.supplierProblems.map(p => (
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
            <SectionLabel light>{h.howItWorks.label}</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
              {h.howItWorks.heading}
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">{h.howItWorks.sub}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {h.howItWorks.layers.map((l, i) => {
              const LayerIcon = LAYER_ICONS[i];
              const layerColors = [
                { color: "from-primary/20 to-primary/5", border: "border-primary/30", badge: "bg-primary/20 text-primary", buyerTag: "text-primary" },
                { color: "from-amber-500/20 to-amber-500/5", border: "border-amber-500/30", badge: "bg-amber-500/20 text-amber-400", buyerTag: "text-sky-400" },
                { color: "from-sky-500/20 to-sky-500/5", border: "border-sky-500/30", badge: "bg-sky-500/20 text-sky-400", buyerTag: "text-sky-400" },
              ][i];
              return (
                <motion.div
                  key={l.title}
                  variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className={`relative p-8 rounded-2xl border ${layerColors.border} bg-gradient-to-b ${layerColors.color} flex flex-col`}
                >
                  <div className={`inline-flex items-center gap-2 ${layerColors.badge} text-xs font-semibold px-3 py-1 rounded-full mb-6 w-fit`}>
                    {l.step}
                  </div>
                  <LayerIcon className="w-8 h-8 mb-4 text-white/60" />
                  <h3 className="text-xl font-serif font-bold mb-5">{l.title}</h3>
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 mb-1">{h.howItWorks.buyersTag}</div>
                      <p className="text-white/60 text-xs leading-relaxed">{l.buyerValue}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">{h.howItWorks.suppliersTag}</div>
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
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 4. FOR BUYERS ────────────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <SectionLabel>{h.forBuyers.label}</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                {h.forBuyers.heading}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">{h.forBuyers.sub}</p>
              <div className="space-y-4">
                {h.forBuyers.features.map((f, i) => {
                  const Icon = BUYER_FEATURE_ICONS[i];
                  return (
                    <div key={f.label} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1 text-sm">{f.label}</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-8">
                <Link href="/marketplace">
                  <Button className="bg-primary hover:bg-primary/90">
                    {h.forBuyers.browseBtn} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/rfqs">
                  <Button variant="outline">{h.forBuyers.rfqBtn}</Button>
                </Link>
              </div>
            </motion.div>

            {/* Buyer dashboard mockup */}
            <motion.div
              variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{h.forBuyers.dashboard.title}</span>
                  <span className="text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full font-medium">{h.forBuyers.dashboard.live}</span>
                </div>
                {h.forBuyers.dashboard.orders.map(o => (
                  <div key={o.product} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
                    <div>
                      <div className="font-medium text-sm">{o.product}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> {o.origin} · {o.qty}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${o.statusColor}`}>{o.status}</span>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                  {[
                    { label: h.forBuyers.dashboard.leadTime, value: "14 days" },
                    { label: h.forBuyers.dashboard.docs, value: "100%" },
                    { label: h.forBuyers.dashboard.satisfaction, value: "4.9 ★" },
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
            {/* Supplier dashboard mockup */}
            <motion.div
              variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="relative order-2 lg:order-1"
            >
              <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{h.forSuppliers.dashboard.title}</span>
                  <span className="text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full font-medium">{h.forSuppliers.dashboard.liveOrders}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {SUPPLIER_MARKETS.map(m => (
                    <div key={m.market} className="p-3 rounded-xl border border-border bg-card text-center">
                      <div className="text-xl mb-1">{m.flag}</div>
                      <div className="text-xs font-medium leading-tight">{m.market}</div>
                      <div className="text-[10px] text-primary mt-0.5">{m.orders}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-primary/8 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{h.forSuppliers.dashboard.financeTitle}</span>
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">{h.forSuppliers.dashboard.financeStatus}</span>
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">$28,000</div>
                  <div className="text-xs text-muted-foreground">{h.forSuppliers.dashboard.financeDesc}</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <SectionLabel>{h.forSuppliers.label}</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                {h.forSuppliers.heading}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">{h.forSuppliers.sub}</p>
              <div className="space-y-4">
                {h.forSuppliers.features.map((f, i) => {
                  const Icon = SUPPLIER_FEATURE_ICONS[i];
                  return (
                    <div key={f.label} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-background hover:border-primary/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1 text-sm">{f.label}</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-8">
                <Link href="/register">
                  <Button className="bg-primary hover:bg-primary/90">
                    {h.forSuppliers.applyBtn} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/suppliers">
                  <Button variant="outline">{h.forSuppliers.suppliersBtn}</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 6. TRACTION ──────────────────────────────────────────────────── */}
      <section className="py-28 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel light>{h.traction.label}</SectionLabel>
              <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                {h.traction.heading}
              </h2>
              <p className="text-primary-foreground/70 text-lg leading-relaxed mb-8">{h.traction.sub}</p>
              <div className="space-y-3">
                {h.traction.bullets.map(bullet => (
                  <div key={bullet} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-foreground/60 shrink-0 mt-0.5" />
                    <span className="text-primary-foreground/80 text-sm leading-relaxed">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {h.traction.stats.map((s, i) => {
                const Icon = TRACTION_STAT_ICONS[i];
                return (
                  <div key={s.label} className="bg-primary-foreground/10 rounded-2xl p-6 border border-primary-foreground/10">
                    <Icon className="w-6 h-6 text-primary-foreground/50 mb-3" />
                    <div className="text-3xl font-bold mb-1">{s.value}</div>
                    <div className="text-primary-foreground/60 text-sm">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. PRODUCTS ──────────────────────────────────────────────────── */}
      <section className="py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <SectionLabel>{h.products.label}</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-5">
              {h.products.heading}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{h.products.sub}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            {h.products.items.map(p => (
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
                {h.products.browseBtn} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 8. DUAL CTA ──────────────────────────────────────────────────── */}
      <section className="py-28 bg-card border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-14">
            <SectionLabel>{h.cta.label}</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-5">
              {h.cta.heading}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              {h.cta.sub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buyer card */}
            <div className="p-8 rounded-2xl border-2 border-sky-200 bg-sky-50 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-5">
                <Search className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-3">{h.cta.buyerCard.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">{h.cta.buyerCard.sub}</p>
              <ul className="space-y-2 mb-8">
                {h.cta.buyerCard.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white h-12">
                  {h.cta.buyerCard.btn} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Supplier card */}
            <div className="p-8 rounded-2xl border-2 border-primary/30 bg-primary/5 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-5">
                <Sprout className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-3">{h.cta.supplierCard.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">{h.cta.supplierCard.sub}</p>
              <ul className="space-y-2 mb-8">
                {h.cta.supplierCard.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full bg-primary hover:bg-primary/90 h-12">
                  {h.cta.supplierCard.btn} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            {h.cta.question}{" "}
            <Link href="/contact">
              <span className="text-primary hover:underline cursor-pointer">{h.cta.talkToTeam}</span>
            </Link>
          </p>
        </div>
      </section>

    </div>
  );
}
