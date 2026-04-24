import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [location] = useLocation();

  const handleLogout = () => {
    logout();
  };

  const NAV_LINKS = [
    { href: "/marketplace", label: t.nav.products },
    { href: "/platform", label: t.nav.platform },
    { href: "/suppliers", label: t.nav.suppliers },
    { href: "/markets", label: t.nav.markets },
    { href: "/impact", label: t.nav.impact },
    { href: "/investors", label: t.nav.investors },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        {/* Brand */}
        <Link href="/" className="mr-8 flex items-center gap-2.5 shrink-0">
          <span className="font-serif text-2xl font-bold text-primary">Fincava</span>
          <span className="hidden sm:block text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full leading-tight tracking-wide border border-border">
            Commerce OS
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
          {NAV_LINKS.map(link => {
            const active = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  active
                    ? "text-primary bg-primary/8 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: language toggle + auth */}
        <div className="ml-auto flex items-center gap-3">
          {/* Language switcher */}
          <div className="flex items-center gap-0.5 bg-muted border border-border rounded-lg p-0.5">
            <button
              onClick={() => setLang("en")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                lang === "en"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLang("es")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                lang === "es"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ES
            </button>
          </div>

          {/* Auth */}
          {isAuthenticated ? (
            <>
              <Link
                href={user?.role === "SUPPLIER" ? "/supplier-dashboard" : "/dashboard"}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.nav.dashboard}
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                {t.nav.logout}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.login}
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  {t.nav.getStarted}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
