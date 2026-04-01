import { Home, Inbox, List, CalendarDays, Settings, BarChart3 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCentral } from '@/contexts/CentralContext';

const tabs = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/inbox', icon: Inbox, label: 'Inbox' },
  { path: '/items', icon: List, label: 'Items' },
  { path: '/agenda', icon: CalendarDays, label: 'Agenda' },
  { path: '/reports', icon: BarChart3, label: 'Painel' },
  { path: '/settings', icon: Settings, label: 'Config' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { inbox } = useCentral();
  const pendingCount = inbox.filter(e => e.status === 'pending').length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors relative',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[9px] font-medium">{label}</span>
              {label === 'Inbox' && pendingCount > 0 && (
                <span className="absolute -top-0.5 right-0 h-3.5 min-w-3.5 px-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
