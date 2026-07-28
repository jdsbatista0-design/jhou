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
const InboxPage = lazy(() => import("@/pages/InboxPage"));
const MemoryPage = lazy(() => import("@/pages/MemoryPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const FinancePage = lazy(() => import("@/pages/FinancePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => null;

// Prefetch all main routes right after the session is ready so tab switches are instant.
const prefetchRoutes = () => {
  const kick = () => {
    import("@/pages/InboxPage");
    import("@/pages/AgendaPage");
    import("@/pages/FinancePage");
    import("@/pages/MemoryPage");
    import("@/pages/ItemDetail");
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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CentralProvider key={`central-${session.user.id}`} userId={session.user.id}>
          <FinanceProvider key={`finance-${session.user.id}`} userId={session.user.id}>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppShell>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/inbox" replace />} />
                    <Route path="/inbox" element={<InboxPage />} />
                    <Route path="/agenda" element={<AgendaPage />} />
                    <Route path="/financas" element={<FinancePage />} />
                    <Route path="/items/:id" element={<ItemDetail />} />
                    {/* Acessíveis via menu de perfil */}
                    <Route path="/memoria" element={<MemoryPage />} />
                    <Route path="/memory" element={<MemoryPage />} />
                    <Route path="/relatorios" element={<ReportsPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/configuracoes" element={<SettingsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </AppShell>
            </BrowserRouter>
          </FinanceProvider>
        </CentralProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
