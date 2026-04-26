import { Link } from "wouter";
import { motion, type Variants } from "framer-motion";
import { CheckCircle2, Globe, Landmark, Package, ArrowRight, Zap, Shield, BarChart2, Cpu, Database, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
} as unknown as Variants;

const stagger = { show: { transition: { staggerChildren: 0.1 } } } as unknown as Variants;

const LAYERS = [
  {
    badge: "Layer 01",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    dot: "bg-emerald-500",
    icon: Globe,
    title: "Market Access",
    subtitle: "Connect Colombian producers to verified international buyers at scale.",
    features: [
      "Verified producer + buyer registry with trust scores",
      "Intelligent product-to-buyer matching (AI-powered)",
      "Request for Quote (RFQ) engine with auto-routing",
      "Multilingual product catalog (EN / ES / AR)",
      "Live price benchmarks and market intelligence",
      "Compliance intelligence per destination market",
    ],
    who: "Exporters, importers, procurement teams",
  },
  {
    badge: "Layer 02",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    dot: "bg-amber-500",
    icon: Landmark,
    title: "Embedded Finance (Launching Soon)",
    subtitle: "Trade finance infrastructure built directly into every transaction.",
    features: [
      "Purchase order financing for verified buyers",
      "Harvest and pre-shipment producer loans",
      "Letter of credit (LC) issuance support",
      "FX conversion at institutional rates",
      "Escrow-based payment release on delivery confirmation",
      "Credit scoring via on-platform trade history",
    ],
    who: "Buyers needing payment terms, producers needing working capital",
  },
  {
    badge: "Layer 03",
    color: "bg-sky-50 border-sky-200 text-sky-700",
    dot: "bg-sky-500",
    icon: Package,
    title: "Distribution",
    subtitle: "End-to-end logistics and compliance from farm gate to destination port.",
    features: [
      "Cross-border freight booking (sea, air, multimodal)",
      "Export documentation automation (phyto, CO, BL)",
      "Cold-chain and temperature-controlled routing",
      "Shipment tracking with event notifications",
      "Customs pre-clearance coordination",
      "Last-mile coordination in UAE, KSA, and Singapore",
    ],
    who: "Suppliers and logistics coordinators",
  },
];

const COMPARISON = [
  { capability: "Producer verification", fincava: true, broker: false, traditional: false },
  { capability: "Embedded trade finance", fincava: true, broker: false, traditional: false },
  { capability: "Direct buyer-producer pricing", fincava: true, broker: false, traditional: false },
  { capability: "Real-time RFQ routing", fincava: true, broker: false, traditional: false },
  { capability: "Compliance intelligence", fincava: true, broker: false, traditional: true },
  { capability: "Shipment tracking", fincava: true, broker: false, traditional: true },
  { capability: "Origin story / traceability", fincava: true, broker: false, traditional: false },
  { capability: "Data flywheel for pricing", fincava: true, broker: false, traditional: false },
];

const TECH = [
  { icon: Cpu, label: "Agentic AI", desc: "AI agents route RFQs, match buyers, flag compliance risks, and generate trade documents automatically." },
  { icon: Database, label: "Live Data Layer", desc: "PostgreSQL-backed data platform tracking 100% of trade events — prices, volumes, routes, geographies." },
  { icon: Network, label: "Modular API", desc: "Every layer exposes a composable API — Market Access, Finance, Distribution can be used independently." },
  { icon: Shield, label: "Trust Infrastructure", desc: "Supplier trust scores, buyer verification, and escrow-based settlement protect every transaction." },
  { icon: BarChart2, label: "Market Intelligence", desc: "Live price benchmarks, demand signals, and regulatory alerts for every target market and product." },
  { icon: Zap, label: "Automation", desc: "Export docs, customs filings, LC generation, and payment release are triggered automatically on-chain of events." },
];

export default function Platform() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="pt-20 pb-16 text-center border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary">Platform Overview</Badge>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6 leading-tight"
          >
            Three Layers.<br />
            <span className="text-primary">One Operating System.</span>
          </motion.h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Fincava is not a marketplace. It's the infrastructure layer that unifies Market Access, Embedded Finance, and Distribution into a single composable system for emerging market commerce.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="lg" variant="outline">Browse Products</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Three Layers */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">The Three System Layers</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Each layer solves a distinct infrastructure failure. Together, they eliminate the compounding inefficiencies that make emerging market trade so expensive.</p>
        </div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="space-y-8"
        >
          {LAYERS.map((layer) => (
            <motion.div key={layer.title} variants={fadeUp} className={`rounded-2xl border p-8 ${layer.color.replace("text-", "").replace("bg-", "border-")}`}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`w-2.5 h-2.5 rounded-full ${layer.dot}`} />
                    <Badge variant="outline" className={layer.color}>{layer.badge}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-xl border ${layer.color}`}>
                      <layer.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold">{layer.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">{layer.subtitle}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Used by:</span> {layer.who}
                  </p>
                </div>
                <div className="lg:col-span-2">
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {layer.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Comparison table */}
      <section className="py-20 bg-muted/30 border-y">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Fincava vs. Alternatives</h2>
            <p className="text-muted-foreground">What you get with integrated infrastructure that brokers and traditional trade cannot offer.</p>
          </div>
          <div className="max-w-3xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-6 font-medium text-sm text-muted-foreground w-1/2">Capability</th>
                  <th className="py-3 px-4 text-center font-semibold text-sm text-primary">Fincava</th>
                  <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Trade Broker</th>
                  <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Traditional Import</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.capability} className={i % 2 === 0 ? "bg-background/50" : ""}>
                    <td className="py-3 pr-6 text-sm">{row.capability}</td>
                    <td className="py-3 px-4 text-center">{row.fincava ? <CheckCircle2 className="w-5 h-5 text-primary mx-auto" /> : <span className="text-muted-foreground text-lg">—</span>}</td>
                    <td className="py-3 px-4 text-center">{row.broker ? <CheckCircle2 className="w-5 h-5 text-primary mx-auto" /> : <span className="text-muted-foreground text-lg">—</span>}</td>
                    <td className="py-3 px-4 text-center">{row.traditional ? <CheckCircle2 className="w-5 h-5 text-primary mx-auto" /> : <span className="text-muted-foreground text-lg">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Technical architecture */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Built on Modern Infrastructure</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Every capability is purpose-built for high-trust, cross-border trade in fragmented markets.</p>
        </div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {TECH.map(t => (
            <motion.div key={t.label} variants={fadeUp} className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow">
              <div className="p-2.5 rounded-lg bg-primary/8 w-fit mb-4">
                <t.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-5">Ready to trade on infrastructure?</h2>
          <p className="text-primary-foreground/80 mb-8 leading-relaxed">Join the buyers and producers already using Fincava to source, finance, and ship Colombian agricultural products globally.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register">
              <Button size="lg" variant="secondary">Create Account <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">Talk to Us</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
