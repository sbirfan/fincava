import { Link } from "wouter";
import { ShieldCheck, Users, FileSearch } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function About() {
  const { t } = useLanguage();
  const ab = t.about;

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-16 md:py-24">

        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6 leading-tight">{ab.heroHeading}</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">{ab.heroDesc}</p>
        </div>

        {/* Problem + Image */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div className="rounded-xl overflow-hidden shadow-lg h-64 md:h-96">
            <img src="/images/farmer.png" alt="Colombian farmer" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold mb-4 text-primary">{ab.problemHeading}</h2>
            <p className="text-lg text-muted-foreground mb-5 leading-relaxed">{ab.problemDesc}</p>
          </div>
        </div>

        {/* What we do */}
        <div className="max-w-3xl mx-auto mb-24">
          <h2 className="text-3xl font-serif font-bold mb-6 text-center">{ab.missionHeading}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{ab.missionDesc}</p>
        </div>

        {/* Three differentiators */}
        <div className="bg-card border rounded-2xl p-8 md:p-12 mb-24">
          <h2 className="text-3xl font-serif font-bold mb-4 text-center">{ab.differentiatorHeading}</h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">{ab.differentiatorSub}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xl mb-2">{ab.computable}</h3>
              <p className="text-muted-foreground leading-relaxed">{ab.computableDesc}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xl mb-2">{ab.governed}</h3>
              <p className="text-muted-foreground leading-relaxed">{ab.governedDesc}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xl mb-2">{ab.auditable}</h3>
              <p className="text-muted-foreground leading-relaxed">{ab.auditableDesc}</p>
            </div>
          </div>
        </div>

        {/* Closing statement */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-xl text-muted-foreground leading-relaxed">{ab.closingStatement}</p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/marketplace" className="bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors">
              {ab.exploreBtn}
            </Link>
            <Link href="/contact" className="bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-medium hover:bg-secondary/90 transition-colors">
              {ab.contactBtn}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
