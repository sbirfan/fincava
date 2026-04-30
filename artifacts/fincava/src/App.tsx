import { lazy, Suspense, useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { X } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminLayout } from "@/components/layout/admin-layout";

// Public — eagerly loaded (needed on first paint)
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import NotFound from "@/pages/not-found";

// Public — lazy
const Marketplace = lazy(() => import("@/pages/marketplace"));
const ProductDetail = lazy(() => import("@/pages/product-detail"));
const Suppliers = lazy(() => import("@/pages/suppliers"));
const SupplierDetail = lazy(() => import("@/pages/supplier-detail"));
const Markets = lazy(() => import("@/pages/markets"));
const OriginStories = lazy(() => import("@/pages/origin-stories"));
const About = lazy(() => import("@/pages/about"));
const Platform = lazy(() => import("@/pages/platform"));
const Investors = lazy(() => import("@/pages/investors"));
const Contact = lazy(() => import("@/pages/contact"));
const RFQs = lazy(() => import("@/pages/rfqs"));
const RFQDetail = lazy(() => import("@/pages/rfq-detail"));
const Impact = lazy(() => import("@/pages/impact"));
const SupplierMarketplace = lazy(() => import("@/pages/supplier-marketplace"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const OfficerRegisterPage = lazy(() => import("@/pages/officer-register"));

// Buyer Dashboard — lazy
const BuyerDashboard = lazy(() => import("@/pages/dashboard/index"));
const BuyerInquiries = lazy(() => import("@/pages/dashboard/inquiries"));
const BuyerOrders = lazy(() => import("@/pages/dashboard/orders"));
const BuyerOrderDetail = lazy(() => import("@/pages/dashboard/order-detail"));
const BuyerMessages = lazy(() => import("@/pages/dashboard/messages"));
const BuyerProfile = lazy(() => import("@/pages/dashboard/profile"));
const BuyerRFQs = lazy(() => import("@/pages/dashboard/rfqs"));
const BuyerMarketIntel = lazy(() => import("@/pages/dashboard/market-intel"));
const BuyerAnalytics = lazy(() => import("@/pages/dashboard/analytics"));
const AiAssistant = lazy(() => import("@/pages/dashboard/ai-assistant"));
// Supplier Dashboard — lazy
const SupplierDashboard = lazy(() => import("@/pages/supplier-dashboard/index"));
const SupplierProducts = lazy(() => import("@/pages/supplier-dashboard/products"));
const SupplierProductNew = lazy(() => import("@/pages/supplier-dashboard/product-new"));
const SupplierProductEdit = lazy(() => import("@/pages/supplier-dashboard/product-edit"));
const SupplierInquiries = lazy(() => import("@/pages/supplier-dashboard/inquiries"));
const SupplierOrders = lazy(() => import("@/pages/supplier-dashboard/orders"));
const SupplierProfile = lazy(() => import("@/pages/supplier-dashboard/profile"));
const SupplierRFQs = lazy(() => import("@/pages/supplier-dashboard/rfqs"));
const SupplierPerformance = lazy(() => import("@/pages/supplier-dashboard/performance"));
const SupplierFinance = lazy(() => import("@/pages/supplier-dashboard/finance"));

// Admin — lazy
const AdminDashboard = lazy(() => import("@/pages/admin/index"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminOrders = lazy(() => import("@/pages/admin/orders"));
const AdminSuppliers = lazy(() => import("@/pages/admin/suppliers"));
const AdminTeam = lazy(() => import("@/pages/admin/team"));
const AdminIngestion = lazy(() => import("@/pages/admin/ingestion/index"));
const AdminIngestionNew = lazy(() => import("@/pages/admin/ingestion/new"));
const AdminIngestionDiscover = lazy(() => import("@/pages/admin/ingestion/discover"));
const OfficerDashboard = lazy(() => import("@/pages/officer/dashboard"));

// ── MVP Early-Access Banner ────────────────────────────────────────────────────
const BANNER_KEY = "fincava_mvp_banner_dismissed";

function MvpBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(BANNER_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(BANNER_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative z-50 bg-[#1B5E20] text-white text-sm px-4 py-2.5 flex items-center justify-center gap-3">
      <span className="text-center leading-snug">
        <strong>Fincava is in early access.</strong> We are actively building — some features may be unstable or incomplete.
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-6 h-6 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
  </div>
);

function PrivateRoute({ component: Component, roles, layout: Layout = AppLayout }: {
  component: React.ComponentType;
  roles?: string[];
  layout?: React.ComponentType<{ children: React.ReactNode }>;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (roles && user && !roles.includes(user.role)) return <Redirect to="/" />;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public */}
        <Route path="/" component={() => <AppLayout><Home /></AppLayout>} />
        <Route path="/marketplace" component={() => <AppLayout><Marketplace /></AppLayout>} />
        <Route path="/supplier-marketplace" component={() => <AppLayout><SupplierMarketplace /></AppLayout>} />
        <Route path="/product/:id" component={() => <AppLayout><ProductDetail /></AppLayout>} />
        <Route path="/suppliers" component={() => <AppLayout><Suppliers /></AppLayout>} />
        <Route path="/supplier/:id" component={() => <AppLayout><SupplierDetail /></AppLayout>} />
        <Route path="/markets" component={() => <AppLayout><Markets /></AppLayout>} />
        <Route path="/rfqs" component={() => <AppLayout><RFQs /></AppLayout>} />
        <Route path="/rfq/:id" component={() => <AppLayout><RFQDetail /></AppLayout>} />
        <Route path="/impact" component={() => <AppLayout><Impact /></AppLayout>} />
        <Route path="/origin-stories" component={() => <AppLayout><OriginStories /></AppLayout>} />
        <Route path="/about" component={() => <AppLayout><About /></AppLayout>} />
        <Route path="/platform" component={() => <AppLayout><Platform /></AppLayout>} />
        <Route path="/investors" component={() => <AppLayout><Investors /></AppLayout>} />
        <Route path="/contact" component={() => <AppLayout><Contact /></AppLayout>} />
        <Route path="/login" component={() => <AppLayout><Login /></AppLayout>} />
        <Route path="/register" component={() => <AppLayout><Register /></AppLayout>} />
        <Route path="/forgot-password" component={() => <AppLayout><ForgotPassword /></AppLayout>} />
        <Route path="/reset-password" component={() => <AppLayout><ResetPassword /></AppLayout>} />
        <Route path="/verify-email" component={() => <VerifyEmail />} />
        <Route path="/onboarding" component={() => <AppLayout><OnboardingPage /></AppLayout>} />
        <Route path="/officer/register" component={() => <AppLayout><OfficerRegisterPage /></AppLayout>} />

        {/* Buyer Dashboard */}
        <Route path="/dashboard" component={() => <PrivateRoute component={BuyerDashboard} roles={["BUYER"]} layout={DashboardLayout} />} />
        <Route path="/dashboard/rfqs" component={() => <PrivateRoute component={BuyerRFQs} roles={["BUYER"]} layout={DashboardLayout} />} />
        <Route path="/dashboard/rfqs/new" component={() => <PrivateRoute component={BuyerRFQs} roles={["BUYER"]} layout={DashboardLayout} />} />
        <Route path="/dashboard/inquiries" component={() => <PrivateRoute component={BuyerInquiries} roles={["BUYER"]} layout={DashboardLayout} />} />
        <Route path="/dashboard/orders" component={() => <PrivateRoute component={BuyerOrders} roles={["BUYER"]} layout={DashboardLayout} />} />
        <Route path="/dashboard/orders/:id" component={() => <PrivateRoute component={BuyerOrderDetail} roles={["BUYER"]} layout={DashboardLayout} />} />
        <Route path="/dashboard/messages" component={() => <PrivateRoute component={BuyerMessages} roles={["BUYER"]} layout={DashboardLayout} />} />
        <Route path="/dashboard/market-intel" component={() => <PrivateRoute component={BuyerMarketIntel} roles={["BUYER"]} layout={DashboardLayout} />} />
        <Route path="/dashboard/analytics" component={() => <PrivateRoute component={BuyerAnalytics} roles={["BUYER"]} layout={DashboardLayout} />} />
        <Route path="/dashboard/profile" component={() => <PrivateRoute component={BuyerProfile} roles={["BUYER"]} layout={DashboardLayout} />} />
        <Route path="/dashboard/ai-assistant" component={() => <PrivateRoute component={AiAssistant} roles={["BUYER"]} layout={DashboardLayout} />} />

        {/* Supplier Dashboard */}
        <Route path="/supplier-dashboard" component={() => <PrivateRoute component={SupplierDashboard} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
        <Route path="/supplier-dashboard/products" component={() => <PrivateRoute component={SupplierProducts} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
        <Route path="/supplier-dashboard/products/new" component={() => <PrivateRoute component={SupplierProductNew} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
        <Route path="/supplier-dashboard/products/:id/edit" component={() => <PrivateRoute component={SupplierProductEdit} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
        <Route path="/supplier-dashboard/inquiries" component={() => <PrivateRoute component={SupplierInquiries} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
        <Route path="/supplier-dashboard/orders" component={() => <PrivateRoute component={SupplierOrders} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
        <Route path="/supplier-dashboard/rfqs" component={() => <PrivateRoute component={SupplierRFQs} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
        <Route path="/supplier-dashboard/performance" component={() => <PrivateRoute component={SupplierPerformance} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
        <Route path="/supplier-dashboard/finance" component={() => <PrivateRoute component={SupplierFinance} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
        <Route path="/supplier-dashboard/profile" component={() => <PrivateRoute component={SupplierProfile} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
        <Route path="/supplier-dashboard/ai-assistant" component={() => <PrivateRoute component={AiAssistant} roles={["SUPPLIER"]} layout={DashboardLayout} />} />

        {/* Admin */}
        <Route path="/admin" component={() => <PrivateRoute component={AdminDashboard} roles={["ADMIN"]} layout={AdminLayout} />} />
        <Route path="/admin/users" component={() => <PrivateRoute component={AdminUsers} roles={["ADMIN"]} layout={AdminLayout} />} />
        <Route path="/admin/orders" component={() => <PrivateRoute component={AdminOrders} roles={["ADMIN"]} layout={AdminLayout} />} />
        <Route path="/admin/suppliers" component={() => <PrivateRoute component={AdminSuppliers} roles={["ADMIN"]} layout={AdminLayout} />} />
        <Route path="/admin/team" component={() => <PrivateRoute component={AdminTeam} roles={["ADMIN"]} layout={AdminLayout} />} />
        <Route path="/admin/ingestion" component={() => <PrivateRoute component={AdminIngestion} roles={["ADMIN"]} layout={AdminLayout} />} />
        <Route path="/admin/ingestion/new" component={() => <PrivateRoute component={AdminIngestionNew} roles={["ADMIN"]} layout={AdminLayout} />} />
        <Route path="/admin/ingestion/discover" component={() => <PrivateRoute component={AdminIngestionDiscover} roles={["ADMIN"]} layout={AdminLayout} />} />

        {/* Field officer tool — accessible to ADMINs; extend to FIELD_OFFICER role when officer accounts are added */}
        <Route path="/officer/dashboard" component={() => <PrivateRoute component={OfficerDashboard} roles={["ADMIN"]} />} />

        <Route component={() => <AppLayout><NotFound /></AppLayout>} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <MvpBanner />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
