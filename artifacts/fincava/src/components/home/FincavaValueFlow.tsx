import { motion } from "framer-motion";
import {
  ArrowRight, ArrowDown, CheckCircle2, Globe, ShieldCheck,
  FileText, Languages, Users, Search, ChevronRight,
} from "lucide-react";

const inView = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
} as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] mb-4 text-primary">
      {children}
    </span>
  );
}

export type ValueFlowContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  suppliers: { title: string; subtitle: string; items: string[] };
  fincava: { title: string; subtitle: string; supportLine: string; items: string[] };
  buyers: { title: string; subtitle: string; items: string[] };
  processTitle: string;
  processSteps: string[];
  scalabilityTitle: string;
  scalabilitySubtitle: string;
  scalabilityItems: string[];
};

const FINCAVA_ITEM_ICONS = [FileText, ShieldCheck, FileText, Languages, Users];

export function FincavaValueFlow({ content: c }: { content: ValueFlowContent }) {
  return (
    <section className="py-28 bg-background border-t border-border">
      <div className="container mx-auto px-4">

        {/* ── Header ── */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <SectionLabel>{c.eyebrow}</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-5">
            {c.title}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {c.subtitle}
          </p>
        </div>

        {/* ── Three-column flow ── */}
        <motion.div
          variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0 mb-16"
        >
          {/* Suppliers */}
          <div className="flex-1 rounded-2xl border border-primary/30 bg-primary/5 p-7 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-0.5">
                  {c.suppliers.title}
                </div>
                <div className="text-sm text-muted-foreground">{c.suppliers.subtitle}</div>
              </div>
            </div>
            <ul className="space-y-3 flex-1">
              {c.suppliers.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center md:px-3 py-2 md:py-0">
            <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground/40" />
            <ArrowDown className="block md:hidden w-6 h-6 text-muted-foreground/40" />
          </div>

          {/* FINCAVA hub */}
          <div className="flex-1 rounded-2xl border-2 border-primary/60 bg-[#0a1f12] p-7 flex flex-col relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative z-10 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-0.5">
                    {c.fincava.title}
                  </div>
                  <div className="text-xs text-white/50">{c.fincava.subtitle}</div>
                </div>
              </div>
              <p className="text-xs text-white/40 italic mb-5">{c.fincava.supportLine}</p>
              <ul className="space-y-3 flex-1">
                {c.fincava.items.map((item, i) => {
                  const Icon = FINCAVA_ITEM_ICONS[i] ?? FileText;
                  return (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {item}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center md:px-3 py-2 md:py-0">
            <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground/40" />
            <ArrowDown className="block md:hidden w-6 h-6 text-muted-foreground/40" />
          </div>

          {/* Buyers */}
          <div className="flex-1 rounded-2xl border border-sky-200 bg-sky-50 p-7 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <Search className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-sky-600 mb-0.5">
                  {c.buyers.title}
                </div>
                <div className="text-sm text-sky-700/60">{c.buyers.subtitle}</div>
              </div>
            </div>
            <ul className="space-y-3 flex-1">
              {c.buyers.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-sky-900">
                  <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* ── How it works — 5-step strip ── */}
        <motion.div
          variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="mb-16"
        >
          <div className="max-w-2xl mx-auto text-center mb-10">
            <SectionLabel>{c.processTitle}</SectionLabel>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {c.processSteps.map((step, i) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center mb-4 shrink-0 z-10">
                  <span className="text-sm font-bold text-primary">{i + 1}</span>
                </div>
                {/* Horizontal connector on desktop (hidden on last) */}
                {i < c.processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-px bg-border" />
                )}
                <p className="text-sm text-muted-foreground leading-snug">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Why this scales ── */}
        <motion.div
          variants={inView} initial="hidden" whileInView="visible" viewport={{ once: true }}
        >
          <div className="max-w-4xl mx-auto rounded-2xl border border-border bg-card p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <SectionLabel>{c.scalabilityTitle}</SectionLabel>
                <h3 className="text-2xl md:text-3xl font-serif font-bold mb-4 text-foreground">
                  {c.scalabilitySubtitle}
                </h3>
              </div>
              <ul className="space-y-4">
                {c.scalabilityItems.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <ChevronRight className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
