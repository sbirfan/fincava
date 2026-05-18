import { Link } from "wouter";
import { motion, type Variants } from "framer-motion";
import {
  TrendingUp,
  Users,
  DollarSign,
  Globe,
  CheckCircle2,
  ArrowRight,
  BarChart2,
  ShieldCheck,
  Zap,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
} as unknown as Variants;

const stagger = { show: { transition: { staggerChildren: 0.1 } } } as unknown as Variants;

const REVENUE_STREAMS = [
  {
    badge: "Stream 01",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    dot: "bg-emerald-500",
    icon: BarChart2,
    title: "Marketplace Commission",
    subtitle: "Transaction fees on every successfully closed deal.",
    details: [
      "2–4% take rate on verified orders",
      "Volume discounts unlock premium placement",
      "Scales linearly with GMV growth",
    ],
  },
  {
    badge: "Stream 02",
    color: "bg-sky-50 border-sky-200 text-sky-700",
    dot: "bg-sky-500",
    icon: Layers,
    title: "SaaS Subscriptions",
    subtitle: "Platform tooling for high-volume buyers and exporters.",
    details: [
      "Buyer Pro tier: compliance + market intel dashboard",
      "Supplier Pro tier: analytics + bulk catalog tools",
      "API access for ERP integrations",
    ],
  },
];

const MOATS = [
  {
    icon: ShieldCheck,
    title: "Verified Supply Network",
    desc: "Every producer is screened, scored, and reviewed. Verification is a cost competitors cannot easily replicate at speed.",
  },
  {
    icon: Globe,
    title: "Bilateral Network Effects",
    desc: "More verified suppliers attract more buyers; more buyers attract more suppliers. Classic marketplace flywheel, seeded in Colombia's largest export categories.",
  },
  {
    icon: Zap,
    title: "Compliance Intelligence Lock-in",
    desc: "Once a supplier's certification pipeline runs through Fincava, switching costs are high. Compliance data deepens over time — creating an ever-sharpening verification edge.",
  },
  {
    icon: BarChart2,
    title: "Proprietary Trade Data",
    desc: "Every transaction enriches our market intelligence layer. Benchmarks, price signals, and compliance intel that standalone competitors cannot replicate without deal flow.",
  },
];

const TRACTION = [
  "Marketplace MVP live — products, suppliers, RFQ engine operational",
  "Admin-verified supplier onboarding with full observability stack",
  "Buyer dashboard: orders, analytics, market intel, messaging",
  "Dual-language platform (EN / ES) with Colombia-first positioning",
  "GCS-backed image uploads with pre-signed URL flow",
  "Backup and audit infrastructure in place",
];

export default function Investors() {
  const { t } = useLanguage();
  const inv = t.investors;

  const OPPORTUNITY_STATS = [
    { icon: DollarSign, value: "$180B", label: inv.tamLabel, color: "text-emerald-600" },
    { icon: Users, value: "800K+", label: inv.producersLabel, color: "text-amber-600" },
    { icon: TrendingUp, value: "$2.1B", label: inv.workingCapitalLabel, color: "text-sky-600" },
    { icon: Globe, value: "60+", label: inv.marketsLabel, color: "text-violet-600" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_-20%,rgba(16,185,129,0.12),transparent_60%)] pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 py-24 md:py-32 relative z-10">
          <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-3xl">
            <motion.div variants={fadeUp}>
              <Badge className="mb-6 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full">
                {inv.badge}
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-serif text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]"
            >
              {inv.heading}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed mb-8"
            >
              {inv.description}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold">
                  {inv.requestAccess} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                  {inv.talkToTeam}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Market Opportunity */}
      <section className="py-20 border-b border-zinc-800">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-xs font-semibold text-emerald-400 tracking-[0.12em] uppercase mb-2">{inv.opportunityLabel}</p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-white">{inv.opportunityHeading}</h2>
            </motion.div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {OPPORTUNITY_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <motion.div key={stat.label} variants={fadeUp} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <Icon className={`h-6 w-6 mb-4 ${stat.color}`} />
                    <div className={`text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                    <div className="text-sm text-zinc-400 leading-snug">{stat.label}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Revenue Model */}
      <section className="py-20 border-b border-zinc-800">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-xs font-semibold text-emerald-400 tracking-[0.12em] uppercase mb-2">{inv.businessModelLabel}</p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-white">{inv.businessModelHeading}</h2>
              <p className="mt-3 text-zinc-400 max-w-2xl">{inv.businessModelDesc}</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {REVENUE_STREAMS.map((stream) => {
                const Icon = stream.icon;
                return (
                  <motion.div key={stream.badge} variants={fadeUp} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${stream.color}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${stream.dot}`} />
                        {stream.badge}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800">
                        <Icon className="h-5 w-5 text-zinc-300" />
                      </div>
                      <h3 className="font-semibold text-white">{stream.title}</h3>
                    </div>
                    <p className="text-sm text-zinc-400">{stream.subtitle}</p>
                    <ul className="space-y-2 mt-auto">
                      {stream.details.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-sm text-zinc-300">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Competitive Moats */}
      <section className="py-20 border-b border-zinc-800">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-xs font-semibold text-emerald-400 tracking-[0.12em] uppercase mb-2">{inv.moatsLabel}</p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-white">{inv.moatsHeading}</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-6">
              {MOATS.map((moat) => {
                const Icon = moat.icon;
                return (
                  <motion.div key={moat.title} variants={fadeUp} className="flex gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0 h-fit">
                      <Icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">{moat.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">{moat.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Traction */}
      <section className="py-20 border-b border-zinc-800">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-xs font-semibold text-emerald-400 tracking-[0.12em] uppercase mb-2">{inv.tractionLabel}</p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-white">{inv.tractionHeading}</h2>
            </motion.div>
            <motion.ul variants={stagger} className="grid md:grid-cols-2 gap-3 max-w-3xl">
              {TRACTION.map((item) => (
                <motion.li key={item} variants={fadeUp} className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-300">{item}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={stagger} className="max-w-2xl">
            <motion.div variants={fadeUp}>
              <Badge className="mb-6 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full">
                {inv.ctaLabel}
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">
              {inv.ctaHeading}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-zinc-400 mb-8 leading-relaxed">{inv.ctaDesc}</motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link href="/contact">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold">
                  {inv.contactTeam} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/platform">
                <Button size="lg" variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                  {inv.explorePlatform}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
