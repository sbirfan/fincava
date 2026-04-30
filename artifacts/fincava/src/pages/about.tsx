import { Link } from "wouter";
import { ShieldCheck, Users, FileSearch } from "lucide-react";

export default function About() {
  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-16 md:py-24">

        {/* ── Hero ── */}
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6 leading-tight">
            Trust infrastructure for agricultural trade
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-4">
            Fincava was born from a simple observation: Colombian soil produces
            some of the world&apos;s most sought-after agricultural goods, yet the
            supply chain remains opaque, complex, and inaccessible for many
            international buyers.
          </p>
          <p className="text-xl text-muted-foreground leading-relaxed">
            We are building the trust infrastructure for agricultural trade in
            emerging markets, starting with Colombian coffee and cacao, and
            expanding across additional crops over time.
          </p>
        </div>

        {/* ── Problem + Image ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div className="rounded-xl overflow-hidden shadow-lg h-64 md:h-96">
            <img
              src="/images/farmer.png"
              alt="Colombian farmer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold mb-4 text-primary">
              The problem we solve
            </h2>
            <p className="text-lg text-muted-foreground mb-5 leading-relaxed">
              High-quality smallholder farmers are often invisible to global
              buyers. Without verifiable data, consistent standards, and trusted
              coordination, strong producers are overlooked and buyers face
              unnecessary risk.
            </p>
            <p className="text-lg font-medium text-foreground leading-relaxed">
              Fincava changes that.
            </p>
          </div>
        </div>

        {/* ── What we do ── */}
        <div className="max-w-3xl mx-auto mb-24">
          <h2 className="text-3xl font-serif font-bold mb-6 text-center">
            What we do
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-5">
            Our platform transforms unverified farmers into credentialed,
            buyer-ready suppliers. Beginning in Colombia, we work directly with
            smallholders to structure, verify, and continuously update
            production and quality data, starting with coffee and cacao, and
            expanding into other key crops over time.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-5">
            We combine intelligent scoring, structured rules, and human
            oversight to evaluate supplier quality in a way that is transparent,
            consistent, and auditable. Every supplier profile becomes a living,
            versioned record of trust, not just a static listing.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed italic">
            This means buyers don&apos;t rely on guesswork and farmers don&apos;t rely on
            chance.
          </p>
        </div>

        {/* ── Three differentiators ── */}
        <div className="bg-card border rounded-2xl p-8 md:p-12 mb-24">
          <h2 className="text-3xl font-serif font-bold mb-4 text-center">
            How trust is built differently
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            What makes Fincava different is how trust is constructed, not assumed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xl mb-2">Computable</h3>
              <p className="text-muted-foreground leading-relaxed">
                Supplier quality is measured using structured data and
                AI-assisted evaluation, not intuition or reputation alone.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xl mb-2">Governed</h3>
              <p className="text-muted-foreground leading-relaxed">
                Human operators review, validate, and override when needed,
                keeping accountability at the centre of every decision.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xl mb-2">Auditable</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every change is tracked, creating a complete history of
                decisions that buyers and operators can inspect at any time.
              </p>
            </div>
          </div>
        </div>

        {/* ── Closing statement ── */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-xl text-muted-foreground leading-relaxed mb-4">
            We are not a traditional marketplace. We are the system that makes a
            marketplace work, by ensuring that every transaction starts with
            clarity, credibility, and confidence.
          </p>
          <p className="text-xl font-medium text-foreground leading-relaxed">
            Fincava connects smallholders to global demand and makes them
            trusted participants in it.
          </p>
        </div>

        {/* ── CTA ── */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/marketplace"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              Explore the marketplace
            </Link>
            <Link
              href="/contact"
              className="bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-medium hover:bg-secondary/90 transition-colors"
            >
              Get in touch
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
