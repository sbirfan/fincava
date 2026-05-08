import { ReactNode, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageContext } from "@/contexts/LanguageContext";
import { translations } from "@/i18n/translations";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  ShoppingCart,
  Sprout,
  LogOut,
  Menu,
  ShieldAlert,
  Home,
  DatabaseZap,
  MapPin,
  UserSquare2,
  Link2,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Leaf,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Buyers", href: "/admin/buyers", icon: UserSquare2 },
  { name: "Buyer Matches", href: "/admin/buyer-matches", icon: Link2 },
  { name: "Buyer Gaps", href: "/admin/buyer-gaps", icon: AlertTriangle },
  { name: "Suppliers", href: "/admin/suppliers", icon: Sprout },
  { name: "Compliance Queue", href: "/admin/compliance-queue", icon: ClipboardCheck },
  { name: "Ingestion", href: "/admin/ingestion", icon: DatabaseZap },
  { name: "Field Visits", href: "/officer/dashboard", icon: MapPin },
  { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { name: "Team", href: "/admin/team", icon: UsersRound },
  { name: "Public Metrics", href: "/admin/public-metrics", icon: BarChart3 },
  { name: "Producer Stories", href: "/admin/stories", icon: BookOpen },
  { name: "Origin Stories", href: "/admin/origin-stories", icon: Leaf },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  // Admin console is always English — override the shared LanguageContext so
  // that bilingual strings in admin pages always resolve to the English branch,
  // regardless of the user's browser locale or the marketplace language toggle.
  const adminLangValue = useMemo(
    () => ({ lang: "en" as const, setLang: () => {}, t: translations["en"] }),
    [],
  );

  const handleLogout = () => {
    logout();
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col" style={{ background: "#050f0a" }}>
      <div className="flex h-[60px] items-center border-b border-white/10 px-6 gap-3">
        <ShieldAlert className="h-5 w-5 text-emerald-400" />
        <span className="font-serif text-xl font-bold text-white">
          Fincava <span className="text-emerald-400 text-sm font-sans font-semibold">Admin</span>
        </span>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="grid px-4 gap-0.5 text-sm font-medium">
          <p className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">
            Operations
          </p>
          {navigation.map((item) => {
            const active =
              location === item.href ||
              (item.href !== "/admin" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                  active
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/10 p-4 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-all"
        >
          <Home className="h-4 w-4" />
          View Site
        </Link>
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-bold">
            {user?.firstName?.charAt(0) ?? "A"}
          </div>
          <div className="flex-1 overflow-hidden text-sm">
            <p className="font-medium truncate text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-white/40 truncate text-xs">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-white/10 text-white/60 hover:text-white hover:bg-white/5 bg-transparent cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]"
      style={{ background: "#0a140e" }}
    >
      <div className="hidden border-r border-white/10 md:block">
        <SidebarContent />
      </div>

      <div className="flex flex-col">
        <header
          className="flex h-14 items-center gap-4 border-b border-white/10 px-4 lg:h-[60px] lg:px-6"
          style={{ background: "#050f0a" }}
        >
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden border-white/10 text-white bg-transparent"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 border-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold tracking-wide">
              INTERNAL — ADMIN ONLY
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8 text-white">
          <LanguageContext.Provider value={adminLangValue}>
            {children}
          </LanguageContext.Provider>
        </main>
      </div>
    </div>
  );
}
