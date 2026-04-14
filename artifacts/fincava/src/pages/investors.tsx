import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  TrendingUp, DollarSign, Globe, Users, Handshake, BarChart2,
  ArrowRight, CheckCircle2, Layers, Shield, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};
const stagger = { show: { transition: { staggerChildren: 0.12 } } };

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

const REVENUE = [
  {
    stream: "Transaction Layer",
    rate: "2–4% GMV",
    description: "Take rate on every completed trade order. Scales linearly with volume.",
    color: "border-emerald-200 bg-emerald-50",
    badge: "Primary",
  },
  {
    stream: "Embedded Finance",
    rate: "8–18% APR",
    description: "Interest revenue from purchase order financing and producer harvest loans.",
    color: "border-amber-200 bg-amber-50",
    badge: "High Margin",
  },
  {
    stream: "Commerce OS SaaS",
    rate: "$500–2K/mo",
    description: "White-label OS licensing to producer cooperatives and regional trade chambers.",
    color: "border-sky-200 bg-sky-50",
    badge: "Future",
  },
];

const MOATS = [
  {
    icon: Globe,
    title: "Local Ecosystem Depth",
    desc: "On-the-ground producer relationships in Huila, Cauca, Antioquia — not achievable by remote competitors.",
  },
  {
    icon: Layers,
    title: "Unified Architecture",
    desc: "No other platform combines market access, finance, and distribution in one system for this market.",
  },
  {
    icon: BarChart2,
    title: "Data Flywheel",
    desc: "Every trade enriches pricing, trust, and routing models — compounding advantage with each transaction.",
  },
  {
    icon: Shield,
    title: "Compliance Infrastructure",
    desc: "Regulatory intelligence for 12+ destination markets built into the product — not a bolt-on.",
  },
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
    role: "Full-stack trade platform — live in production",
    detail: "Not a deck. A working Commerce OS with live order flow, RFQs, producer stories, and real data.",
  },
];

export default function Investors() {
  return (
    <div className="bg-background">
      {/* Hero */}
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
              Fincava is the infrastructure layer connecting Colombian agricultural producers to $180B in annual demand across the Middle East, Asia, and Africa — with embedded finance, distribution, and compliance built in.
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

      {/* Market metrics */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">The Market Opportunity</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Three converging forces — Colombia's production surplus, MENA/Asia demand explosion, and broken B2B infrastructure — create a structural arbitrage opportunity.</p>
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

      {/* Traction */}
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

      {/* Revenue model */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Multi-Layer Revenue Model</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Each layer generates independent revenue and compounds with the next. Every account is a 3x revenue opportunity.</p>
        </div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {REVENUE.map(r => (
            <motion.div key={r.stream} variants={fadeUp} className={`p-7 rounded-2xl border ${r.color}`}>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className="text-xs">{r.badge}</Badge>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mb-1">{r.rate}</p>
              <p className="font-semibold text-sm mb-3">{r.stream}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
            </motion.div>
          ))}
        </motion.div>
        <div className="text-center mt-8 text-sm text-muted-foreground">
          Unit economics: a single $50K order generates ~$1,500 transaction revenue + up to $3,600 in financing fees if financed at 18% for 6 months.
        </div>
      </section>

      {/* Competitive moats */}
      <section className="py-20 bg-muted/30 border-y">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Why This Compounds</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Each moat reinforces the next. Local depth feeds the data flywheel. The data flywheel strengthens compliance and credit models.</p>
          </div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {MOATS.map(m => (
              <motion.div key={m.title} variants={fadeUp} className="flex gap-5 p-6 rounded-xl border bg-card">
                <div className="p-2.5 rounded-lg bg-primary/8 shrink-0 h-fit">
                  <m.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5">{m.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Team */}
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

      {/* CTA */}
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
