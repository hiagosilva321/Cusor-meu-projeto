import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WhatsAppProvider } from "@/contexts/WhatsAppContext";
import Index from "./pages/Index.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";

const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const Payment = lazy(() => import("./pages/Payment.tsx"));
const PaymentConfirmed = lazy(() => import("./pages/PaymentConfirmed.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads.tsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.tsx"));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers.tsx"));
const AdminSizes = lazy(() => import("./pages/admin/AdminSizes.tsx"));
const AdminWhatsApp = lazy(() => import("./pages/admin/AdminWhatsApp.tsx"));
const AdminCounters = lazy(() => import("./pages/admin/AdminCounters.tsx"));
const AdminRegions = lazy(() => import("./pages/admin/AdminRegions.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));

const PageLoader = () => (
  <div className="flex min-h-[100dvh] min-h-screen w-full items-center justify-center bg-muted text-muted-foreground">
    A carregar…
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <WhatsAppProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/pagamento/:orderId" element={<Payment />} />
              <Route path="/pagamento-confirmado/:orderId" element={<PaymentConfirmed />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/leads" element={<AdminLeads />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/offers" element={<AdminOffers />} />
              <Route path="/admin/sizes" element={<AdminSizes />} />
              <Route path="/admin/whatsapp" element={<AdminWhatsApp />} />
              <Route path="/admin/counters" element={<AdminCounters />} />
              <Route path="/admin/regions" element={<AdminRegions />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </WhatsAppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
