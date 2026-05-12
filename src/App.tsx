import { useState, useEffect, lazy, Suspense } from "react";
import type { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CentralProvider } from "@/contexts/CentralContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import CaptureFAB from "@/components/CaptureFAB";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";

// Lazy-loaded routes — keeps initial bundle small
const ItemDetail = lazy(() => import("@/pages/ItemDetail"));
const AgendaPage = lazy(() => import("@/pages/AgendaPage"));
const MemoryPage = lazy(() => import("@/pages/MemoryPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const FinancePage = lazy(() => import("@/pages/FinancePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();
const CENTRAL_PIN = "0507";

function clearLegacyUnscopedCache() {
  [
    "central_inbox_cache",
    "central_items_cache",
    "central_memories_cache",
    "central_events_cache",
    "central_recurrences_cache",
    "fin_companies_cache",
    "fin_accounts_cache",
    "fin_cards_cache",
    "fin_categories_cache",
    "fin_people_cache",
    "fin_recurrences_cache",
    "fin_transactions_cache",
  ].forEach(key => localStorage.removeItem(key));
}

function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const press = (digit: string) => {
    setError(false);
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      if (next === CENTRAL_PIN) {
        onUnlock();
      } else {
        setError(true);
        window.setTimeout(() => setPin(""), 180);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-6 text-center">
        <div className="space-y-2">
          <div className="text-4xl">🔒</div>
          <h1 className="text-2xl font-bold text-foreground">Central</h1>
          <p className="text-xs text-muted-foreground">Digite o PIN para abrir seus dados.</p>
        </div>

        <div className="flex justify-center gap-2" aria-label="PIN digitado">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full border ${pin.length > i ? 'bg-primary border-primary' : error ? 'border-destructive' : 'border-border'}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9'].map(digit => (
            <button key={digit} onClick={() => press(digit)} className="h-14 rounded-2xl bg-card border border-border text-xl font-semibold text-foreground active:bg-accent">
              {digit}
            </button>
          ))}
          <button onClick={() => setPin(pin.slice(0, -1))} className="h-14 rounded-2xl bg-card border border-border text-sm font-semibold text-muted-foreground active:bg-accent">
            Apagar
          </button>
          <button onClick={() => press('0')} className="h-14 rounded-2xl bg-card border border-border text-xl font-semibold text-foreground active:bg-accent">
            0
          </button>
          <button onClick={() => setPin("")} className="h-14 rounded-2xl bg-card border border-border text-sm font-semibold text-muted-foreground active:bg-accent">
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinUnlockedUserId, setPinUnlockedUserId] = useState<string | null>(null);

  useEffect(() => {
    // CRITICAL: subscribe BEFORE getSession (per Lovable auth rules)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (!newSession) setPinUnlockedUserId(null);
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

  void pinUnlockedUserId;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CentralProvider key={`central-${session.user.id}`} userId={session.user.id}>
          <FinanceProvider key={`finance-${session.user.id}`} userId={session.user.id}>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <main className="max-w-lg mx-auto px-4 pt-4 pb-20">
                <Suspense fallback={<div className="text-sm text-muted-foreground p-4 animate-pulse">Carregando…</div>}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/items/:id" element={<ItemDetail />} />
                    <Route path="/agenda" element={<AgendaPage />} />
                    <Route path="/memory" element={<MemoryPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/financas" element={<FinancePage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <CaptureFAB />
              <BottomNav />
            </div>
          </BrowserRouter>
          </FinanceProvider>
        </CentralProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
