import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CentralProvider } from "@/contexts/CentralContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import CaptureFAB from "@/components/CaptureFAB";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";

import ItemsPage from "@/pages/ItemsPage";
import ItemDetail from "@/pages/ItemDetail";
import AgendaPage from "@/pages/AgendaPage";
import MemoryPage from "@/pages/MemoryPage";
import SettingsPage from "@/pages/SettingsPage";
import ReportsPage from "@/pages/ReportsPage";
import FinancePage from "@/pages/FinancePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CRITICAL: subscribe BEFORE getSession (per Lovable auth rules)
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
        <CentralProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <main className="max-w-lg mx-auto px-4 pt-4 pb-20">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  
                  <Route path="/items" element={<ItemsPage />} />
                  <Route path="/items/:id" element={<ItemDetail />} />
                  <Route path="/agenda" element={<AgendaPage />} />
                  <Route path="/memory" element={<MemoryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/financas" element={<FinancePage />} />
                  <Route path="*" element={<NotFound />} />
              </Routes>
              </main>
              <CaptureFAB />
              <BottomNav />
            </div>
          </BrowserRouter>
        </CentralProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
