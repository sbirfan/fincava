import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { ENABLE_TRANSACTIONS, ENABLE_FINANCE } from "@/lib/flags";
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  ShoppingCart,
  User,
  LogOut,
  Menu,
  ShieldCheck,
  PlusCircle,
  FileQuestion,
  BarChart2,
  Globe,
  Landmark,
  Mail,
  X,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const showVerificationBanner = !!user && !user.emailVerifiedAt && !bannerDismissed;

  const handleResend = async () => {
    if (resending || resendDone) return;
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", { method: "POST", credentials: "include" });
      setResendDone(true);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch {
      // silently ignore
    } finally {
      setResending(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const isSupplier = user?.role === "SUPPLIER";
  const basePath = isSupplier ? "/supplier-dashboard" : "/dashboard";

  const navigation = (isSupplier ? [
    { name: 'Overview', href: basePath, icon: LayoutDashboard },
    { name: 'Products', href: `${basePath}/products`, icon: Package },
    { name: 'Add Product', href: `${basePath}/products/new`, icon: PlusCircle },
    { name: 'Inquiries', href: `${basePath}/inquiries`, icon: MessageSquare },
    // Orders hidden until ENABLE_TRANSACTIONS flag is on.
    { name: 'Orders', href: `${basePath}/orders`, icon: ShoppingCart, hidden: !ENABLE_TRANSACTIONS },
    { name: 'RFQ Inbox', href: `${basePath}/rfqs`, icon: FileQuestion },
    // Trade Finance hidden until ENABLE_FINANCE flag is on.
    { name: 'Trade Finance', href: `${basePath}/finance`, icon: Landmark, hidden: !ENABLE_FINANCE },
    // Performance hidden until intelligence layer is public (ENABLE_INTELLIGENCE_PUBLIC).
    { name: 'Performance', href: `${basePath}/performance`, icon: BarChart2, hidden: true },
    // AI Assistant link hidden until full production release. Route still exists at `${basePath}/ai-assistant`.
    { name: 'Company Profile', href: `${basePath}/profile`, icon: User },
    { name: 'Payment Method', href: `${basePath}/payment-method`, icon: Wallet },
  ] : [
    { name: 'Overview', href: basePath, icon: LayoutDashboard },
    { name: 'My RFQs', href: `${basePath}/rfqs`, icon: FileQuestion },
    { name: 'My Inquiries', href: `${basePath}/inquiries`, icon: MessageSquare },
    // Orders hidden until ENABLE_TRANSACTIONS flag is on.
    { name: 'Orders', href: `${basePath}/orders`, icon: ShoppingCart, hidden: !ENABLE_TRANSACTIONS },
    { name: 'Messages', href: `${basePath}/messages`, icon: MessageSquare },
    // Market Intelligence hidden until ENABLE_INTELLIGENCE_PUBLIC is on.
    { name: 'Market Intelligence', href: `${basePath}/market-intel`, icon: Globe, hidden: true },
    // Analytics hidden until ENABLE_INTELLIGENCE_PUBLIC is on.
    { name: 'Analytics', href: `${basePath}/analytics`, icon: BarChart2, hidden: true },
    // AI Assistant link hidden until full production release. Route still exists at `${basePath}/ai-assistant`.
    { name: 'Sourcing Profile', href: `${basePath}/profile`, icon: User },
  ]).filter(item => !item.hidden);

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4">
      <div className="flex h-[60px] items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-bold text-primary">
          Fincava
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          <div className="mb-4 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isSupplier ? 'Supplier Dashboard' : 'Buyer Dashboard'}
          </div>
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:text-primary ${
                location === item.href || (item.href !== basePath && location.startsWith(item.href))
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto border-t p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {user?.firstName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden text-sm">
            <p className="font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2 cursor-pointer" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] bg-muted/20">
      <div className="hidden border-r bg-card md:block">
        <SidebarContent />
      </div>
      <div className="flex flex-col">
        {showVerificationBanner && (
          <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800">
            <Mail className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="flex-1">
              {resendDone
                ? "Verification email sent! Please check your inbox."
                : "Please verify your email address to access all features."}
            </span>
            {!resendDone && (
              <button
                onClick={handleResend}
                disabled={resending}
                className="font-medium underline underline-offset-2 hover:text-amber-900 disabled:opacity-60 cursor-pointer"
              >
                {resending ? "Sending…" : "Resend email"}
              </button>
            )}
            <button
              onClick={() => setBannerDismissed(true)}
              className="ml-1 p-0.5 rounded hover:bg-amber-100 cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex items-center space-x-4">
              <Link href="/marketplace" className="text-sm font-medium hover:underline hidden sm:block">
                View Marketplace
              </Link>
              {isSupplier && user?.companyVerified && (
                <div className="hidden sm:flex items-center gap-1.5 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-200">
                  <ShieldCheck className="h-4 w-4" />
                  Verified Supplier
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
