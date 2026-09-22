import { useState, useEffect, lazy, Suspense } from "react";
import type { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CentralProvider } from "@/contexts/CentralContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import Auth from "@/pages/Auth";

// Lazy-loaded routes — initial bundle stays small
const ItemDetail = lazy(() => import("@/pages/ItemDetail"));
const AgendaPage = lazy(() => import("@/pages/AgendaPage"));
const MemoryPage = lazy(() => import("@/pages/MemoryPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const BillsPage = lazy(() => import("@/pages/BillsPage"));
const CardsPage = lazy(() => import("@/pages/CardsPage"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="pt-6 flex justify-center">
    <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

// Prefetch principal routes right after session is ready so tab switches are instant.
const prefetchRoutes = () => {
  const kick = () => {
    import("@/pages/AgendaPage");
    import("@/pages/BillsPage");
    import("@/pages/CardsPage");
    import("@/pages/MemoryPage");
  };
  const idle = (window as any).requestIdleCallback;
  if (idle) idle(kick, { timeout: 500 }); else setTimeout(kick, 0);
};


const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe BEFORE getSession (Lovable auth rule)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) prefetchRoutes();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Carregando…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Auth />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const withFinance = (node: React.ReactNode) => (
    <FinanceProvider key={`finance-${session.user.id}`} userId={session.user.id}>
      {node}
    </FinanceProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CentralProvider key={`central-${session.user.id}`} userId={session.user.id}>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppShell session={session}>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/agenda" replace />} />
                  <Route path="/agenda" element={withFinance(<AgendaPage />)} />
                  <Route path="/contas" element={withFinance(<BillsPage />)} />
                  <Route path="/cartoes" element={withFinance(<CardsPage />)} />
                  {/* Rotas antigas continuam funcionando */}
                  <Route path="/financas" element={<Navigate to="/contas" replace />} />
                  <Route path="/inbox" element={<Navigate to="/agenda" replace />} />
                  <Route path="/items/:id" element={<ItemDetail />} />
                  <Route path="/rotinas" element={<MemoryPage />} />
                  <Route path="/memoria" element={<Navigate to="/rotinas" replace />} />
                  <Route path="/memory" element={<Navigate to="/rotinas" replace />} />
                  <Route path="/configuracoes" element={<SettingsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  {/* Qualquer rota desconhecida volta para a Agenda em vez de mostrar tela 404 */}
                  <Route path="*" element={<Navigate to="/agenda" replace />} />
                </Routes>
              </Suspense>
            </AppShell>
          </BrowserRouter>
        </CentralProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
