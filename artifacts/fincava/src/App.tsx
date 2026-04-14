import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// Public
import Home from "@/pages/home";
import Marketplace from "@/pages/marketplace";
import ProductDetail from "@/pages/product-detail";
import Suppliers from "@/pages/suppliers";
import SupplierDetail from "@/pages/supplier-detail";
import Markets from "@/pages/markets";
import OriginStories from "@/pages/origin-stories";
import About from "@/pages/about";
import Platform from "@/pages/platform";
import Investors from "@/pages/investors";
import Contact from "@/pages/contact";
import Login from "@/pages/login";
import Register from "@/pages/register";
import RFQs from "@/pages/rfqs";
import RFQDetail from "@/pages/rfq-detail";
import Impact from "@/pages/impact";

// Buyer Dashboard
import BuyerDashboard from "@/pages/dashboard/index";
import BuyerInquiries from "@/pages/dashboard/inquiries";
import BuyerOrders from "@/pages/dashboard/orders";
import BuyerOrderDetail from "@/pages/dashboard/order-detail";
import BuyerMessages from "@/pages/dashboard/messages";
import BuyerProfile from "@/pages/dashboard/profile";
import BuyerRFQs from "@/pages/dashboard/rfqs";
import BuyerMarketIntel from "@/pages/dashboard/market-intel";
import BuyerAnalytics from "@/pages/dashboard/analytics";
import BuyerFinance from "@/pages/dashboard/finance";

// Supplier Dashboard
import SupplierDashboard from "@/pages/supplier-dashboard/index";
import SupplierProducts from "@/pages/supplier-dashboard/products";
import SupplierProductNew from "@/pages/supplier-dashboard/product-new";
import SupplierInquiries from "@/pages/supplier-dashboard/inquiries";
import SupplierOrders from "@/pages/supplier-dashboard/orders";
import SupplierProfile from "@/pages/supplier-dashboard/profile";
import SupplierRFQs from "@/pages/supplier-dashboard/rfqs";
import SupplierPerformance from "@/pages/supplier-dashboard/performance";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function PrivateRoute({ component: Component, roles, layout: Layout = AppLayout }: { component: any, roles?: string[], layout?: any }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={() => <AppLayout><Home /></AppLayout>} />
      <Route path="/marketplace" component={() => <AppLayout><Marketplace /></AppLayout>} />
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
      <Route path="/dashboard/finance" component={() => <PrivateRoute component={BuyerFinance} roles={["BUYER"]} layout={DashboardLayout} />} />
      <Route path="/dashboard/profile" component={() => <PrivateRoute component={BuyerProfile} roles={["BUYER"]} layout={DashboardLayout} />} />

      {/* Supplier Dashboard */}
      <Route path="/supplier-dashboard" component={() => <PrivateRoute component={SupplierDashboard} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
      <Route path="/supplier-dashboard/products" component={() => <PrivateRoute component={SupplierProducts} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
      <Route path="/supplier-dashboard/products/new" component={() => <PrivateRoute component={SupplierProductNew} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
      <Route path="/supplier-dashboard/inquiries" component={() => <PrivateRoute component={SupplierInquiries} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
      <Route path="/supplier-dashboard/orders" component={() => <PrivateRoute component={SupplierOrders} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
      <Route path="/supplier-dashboard/rfqs" component={() => <PrivateRoute component={SupplierRFQs} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
      <Route path="/supplier-dashboard/performance" component={() => <PrivateRoute component={SupplierPerformance} roles={["SUPPLIER"]} layout={DashboardLayout} />} />
      <Route path="/supplier-dashboard/profile" component={() => <PrivateRoute component={SupplierProfile} roles={["SUPPLIER"]} layout={DashboardLayout} />} />

      <Route component={() => <AppLayout><NotFound /></AppLayout>} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
