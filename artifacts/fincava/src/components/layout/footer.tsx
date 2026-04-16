import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function Footer() {
  const { lang, setLang, t } = useLanguage();
  const f = t.footer;

  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold text-primary">Fincava</h3>
            <p className="text-sm text-muted-foreground">{f.tagline}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{f.marketplace}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/marketplace" className="hover:text-primary">{f.allProducts}</Link></li>
              <li><Link href="/suppliers" className="hover:text-primary">{f.verifiedSuppliers}</Link></li>
              <li><Link href="/origin-stories" className="hover:text-primary">{f.originStories}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{f.company}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary">{f.aboutUs}</Link></li>
              <li><Link href="/contact" className="hover:text-primary">{f.contact}</Link></li>
              <li><Link href="/markets" className="hover:text-primary">{f.marketIntelligence}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{f.language}</h4>
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <button
                onClick={() => setLang("en")}
                className={cn(
                  "text-left transition-colors",
                  lang === "en" ? "font-semibold text-primary" : "hover:text-primary"
                )}
              >
                English
              </button>
              <button
                onClick={() => setLang("es")}
                className={cn(
                  "text-left transition-colors",
                  lang === "es" ? "font-semibold text-primary" : "hover:text-primary"
                )}
              >
                Español
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Fincava. {f.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
