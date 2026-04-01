import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CentralProvider } from "@/contexts/CentralContext";
import BottomNav from "@/components/BottomNav";
import Dashboard from "@/pages/Dashboard";
import InboxPage from "@/pages/InboxPage";
import ItemsPage from "@/pages/ItemsPage";
import ItemDetail from "@/pages/ItemDetail";
import AgendaPage from "@/pages/AgendaPage";
import MemoryPage from "@/pages/MemoryPage";
import SettingsPage from "@/pages/SettingsPage";
import ReportsPage from "@/pages/ReportsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/items" element={<ItemsPage />} />
                <Route path="/items/:id" element={<ItemDetail />} />
                <Route path="/agenda" element={<AgendaPage />} />
                <Route path="/memory" element={<MemoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <BottomNav />
          </div>
        </BrowserRouter>
      </CentralProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
