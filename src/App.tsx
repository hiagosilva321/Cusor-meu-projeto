import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WhatsAppProvider } from "@/contexts/WhatsAppContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import {
  ADMIN_CATALOGO_PATH,
  ADMIN_CONFIGURACOES_PATH,
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_PEDIDOS_PATH,
  ADMIN_WHATSAPP_PATH,
} from "@/lib/admin-surface";
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
              <Route path={ADMIN_LOGIN_PATH} element={<AdminLogin />} />
              <Route path={ADMIN_DASHBOARD_PATH} element={<AdminDashboard />} />
              <Route path={ADMIN_PEDIDOS_PATH} element={<AdminPedidos />} />
              <Route path={ADMIN_CATALOGO_PATH} element={<AdminCatalogo />} />
              <Route path={ADMIN_WHATSAPP_PATH} element={<AdminWhatsApp />} />
              <Route path={ADMIN_CONFIGURACOES_PATH} element={<AdminConfiguracoes />} />
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
