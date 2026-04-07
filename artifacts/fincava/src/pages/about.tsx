import { Link } from "wouter";

export default function About() {
  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">Redefining Colombian Trade</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Fincava was born from a simple observation: Colombian soil produces some of the world's most sought-after agricultural goods, but the supply chain remains opaque, complex, and inaccessible for many international buyers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div className="rounded-xl overflow-hidden shadow-lg h-96">
            <img src="/images/cacao.png" alt="Cacao" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold mb-4 text-primary">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              We are building the definitive B2B sourcing marketplace that bridges the gap between Colombian producers and high-value markets in the Middle East, Asia, and Africa.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              By digitizing the sourcing process, enforcing rigorous verification standards, and providing end-to-end traceability, we empower buyers to source with confidence and producers to access global markets fairly.
            </p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-8 md:p-12 mb-24">
          <h2 className="text-3xl font-serif font-bold mb-8 text-center">How Fincava Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-bold text-xl mb-2">Rigorous Verification</h3>
              <p className="text-muted-foreground">Every supplier on Fincava undergoes a strict vetting process for legal compliance, quality capacity, and ethical practices.</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-bold text-xl mb-2">Direct Sourcing</h3>
              <p className="text-muted-foreground">Buyers connect directly with producers, negotiating prices, requesting samples, and establishing long-term relationships.</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-bold text-xl mb-2">Secure Fulfillment</h3>
              <p className="text-muted-foreground">Orders are tracked through our platform from confirmation to delivery, with standardized documentation and logistics support.</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-serif font-bold mb-6">Ready to transform your supply chain?</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors">
              Join as a Buyer
            </Link>
            <Link href="/register" className="bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-medium hover:bg-secondary/90 transition-colors">
              Apply as a Supplier
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
