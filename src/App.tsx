import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WhatsAppProvider } from "@/contexts/WhatsAppContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import Index from "./pages/Index.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";

const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const Payment = lazy(() => import("./pages/Payment.tsx"));
const PaymentConfirmed = lazy(() => import("./pages/PaymentConfirmed.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminPedidos = lazy(() => import("./pages/admin/AdminPedidos.tsx"));
const AdminCatalogo = lazy(() => import("./pages/admin/AdminCatalogo.tsx"));
const AdminWhatsApp = lazy(() => import("./pages/admin/AdminWhatsApp.tsx"));
const AdminConfiguracoes = lazy(() => import("./pages/admin/AdminConfiguracoes.tsx"));

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
      <Sonner />
      <SiteSettingsProvider>
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
              <Route path="/admin/pedidos" element={<AdminPedidos />} />
              <Route path="/admin/catalogo" element={<AdminCatalogo />} />
              <Route path="/admin/whatsapp" element={<AdminWhatsApp />} />
              <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </WhatsAppProvider>
      </SiteSettingsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
