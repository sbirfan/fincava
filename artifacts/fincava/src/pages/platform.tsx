import { Link } from "wouter";
import { motion, type Variants } from "framer-motion";
import { CheckCircle2, Globe, Package, ArrowRight, Zap, Shield, BarChart2, Cpu, Database, Network, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ENABLE_FINANCE } from "@/lib/flags";
import { useLanguage } from "@/contexts/LanguageContext";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
} as unknown as Variants;

const stagger = { show: { transition: { staggerChildren: 0.1 } } } as unknown as Variants;

const LAYER_META = [
  { badge: "Layer 01", color: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500", icon: Globe },
  { badge: "Layer 02", color: "bg-amber-50 border-amber-200 text-amber-700", dot: "bg-amber-500", icon: FileText },
  { badge: "Layer 03", color: "bg-sky-50 border-sky-200 text-sky-700", dot: "bg-sky-500", icon: Package },
];

const COMPARISON_FLAGS = [
  { fincava: true, broker: false, traditional: false },
  { fincava: true, broker: false, traditional: false },
  { fincava: true, broker: false, traditional: false },
  { fincava: true, broker: false, traditional: false },
  { fincava: true, broker: false, traditional: true },
  { fincava: true, broker: false, traditional: true },
  { fincava: true, broker: false, traditional: false },
  { fincava: true, broker: false, traditional: false },
];

const TECH_ICONS = [Cpu, Database, Network, Shield, BarChart2, Zap];

export default function Platform() {
  const { t } = useLanguage();
  const pl = t.platform;

  const headingFull = ENABLE_FINANCE ? pl.heading : pl.headingNoFinance;
  const dotIdx = headingFull.indexOf(". ");
  const headingLine1 = dotIdx !== -1 ? headingFull.slice(0, dotIdx + 1) : headingFull;
  const headingLine2 = dotIdx !== -1 ? headingFull.slice(dotIdx + 2) : "";

  const LAYERS = pl.layers.map((layer, i) => ({ ...LAYER_META[i], ...layer }));
  const COMPARISON = pl.comparisonRows.map((capability, i) => ({ capability, ...COMPARISON_FLAGS[i] }));
  const TECH = pl.tech.map((item, i) => ({ ...item, icon: TECH_ICONS[i] }));

  const VISIBLE_LAYERS = ENABLE_FINANCE ? LAYERS : LAYERS.filter((_, i) => i !== 3);
  const VISIBLE_COMPARISON = ENABLE_FINANCE ? COMPARISON : COMPARISON;

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="pt-20 pb-16 text-center border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary">{pl.badge}</Badge>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6 leading-tight"
          >
            {headingLine1}<br />
            <span className="text-primary">{headingLine2}</span>
          </motion.h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {ENABLE_FINANCE ? pl.sub : pl.subNoFinance}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                {pl.getStarted} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="lg" variant="outline">{pl.browseProducts}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Three Layers */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            {ENABLE_FINANCE ? pl.layersHeading : pl.layersHeadingNoFinance}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{pl.layersDesc}</p>
        </div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="space-y-8"
        >
          {VISIBLE_LAYERS.map((layer) => (
            <motion.div key={layer.badge} variants={fadeUp} className={`rounded-2xl border p-8 ${layer.color.replace("text-", "").replace("bg-", "border-")}`}>
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
                    <span className="font-semibold text-foreground">{pl.usedBy}</span> {layer.who}
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
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">{pl.comparisonHeading}</h2>
            <p className="text-muted-foreground">{pl.comparisonDesc}</p>
          </div>
          <div className="max-w-3xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-6 font-medium text-sm text-muted-foreground w-1/2">{pl.capability}</th>
                  <th className="py-3 px-4 text-center font-semibold text-sm text-primary">{pl.fincava}</th>
                  <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">{pl.tradeBroker}</th>
                  <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">{pl.traditionalImport}</th>
                </tr>
              </thead>
              <tbody>
                {VISIBLE_COMPARISON.map((row, i) => (
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
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">{pl.infraHeading}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{pl.infraDesc}</p>
        </div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {TECH.map(tech => (
            <motion.div key={tech.label} variants={fadeUp} className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow">
              <div className="p-2.5 rounded-lg bg-primary/8 w-fit mb-4">
                <tech.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{tech.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{tech.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-5">{pl.ctaHeading}</h2>
          <p className="text-primary-foreground/80 mb-8 leading-relaxed">{pl.ctaDesc}</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register">
              <Button size="lg" variant="secondary">{pl.createAccount} <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">{pl.talkToUs}</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
