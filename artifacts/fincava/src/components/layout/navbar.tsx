import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  const NAV_LINKS = [
    { href: "/marketplace", label: t.nav.products },
    { href: "/platform", label: t.nav.platform },
    { href: "/suppliers", label: t.nav.suppliers },
    { href: "/markets", label: t.nav.markets },
    { href: "/investors", label: t.nav.investors },
  ];

  const dashboardHref =
    user?.role === "SUPPLIER"
      ? "/supplier-dashboard"
      : user?.role === "ADMIN"
      ? "/admin"
      : "/dashboard";

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

        {/* Desktop nav links */}
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

        {/* Right side: language toggle + auth (desktop) + hamburger (mobile) */}
        <div className="ml-auto flex items-center gap-3">

          {/* Language switcher — visible on all sizes */}
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

          {/* Auth — desktop only */}
          {isAuthenticated ? (
            <>
              <Link
                href={dashboardHref}
                className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.nav.dashboard}
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex cursor-pointer"
                onClick={handleLogout}
              >
                {t.nav.logout}
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.nav.login}
              </Link>
              <Link href="/register" className="hidden md:block">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  {t.nav.getStarted}
                </Button>
              </Link>
            </>
          )}

          {/* Hamburger — mobile only */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-72 p-0 flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-5 py-4 border-b">
                <span className="font-serif text-xl font-bold text-primary">Fincava</span>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full leading-tight tracking-wide border border-border">
                  Commerce OS
                </span>
              </div>

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
                {NAV_LINKS.map(link => {
                  const active = location === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
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

              {/* Bottom: auth */}
              <div className="border-t px-4 py-4 space-y-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button variant="outline" className="w-full cursor-pointer">
                        {t.nav.dashboard}
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full cursor-pointer text-muted-foreground"
                      onClick={handleLogout}
                    >
                      {t.nav.logout}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/register" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full bg-primary hover:bg-primary/90">
                        {t.nav.getStarted}
                      </Button>
                    </Link>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full cursor-pointer">
                        {t.nav.login}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </div>
    </header>
  );
}
