import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold text-primary">Fincava</h3>
            <p className="text-sm text-muted-foreground">
              From Colombian soil, to your supply chain. The premium B2B sourcing marketplace for verified agricultural exports.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Marketplace</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/marketplace" className="hover:text-primary">All Products</Link></li>
              <li><Link href="/suppliers" className="hover:text-primary">Verified Suppliers</Link></li>
              <li><Link href="/origin-stories" className="hover:text-primary">Origin Stories</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
              <li><Link href="/markets" className="hover:text-primary">Market Intelligence</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Language</h4>
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <button className="text-left hover:text-primary font-medium text-primary">English</button>
              <button className="text-left hover:text-primary">Español</button>
              <button className="text-left hover:text-primary">العربية</button>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Fincava. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
