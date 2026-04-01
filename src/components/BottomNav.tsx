import { Home, Inbox, List, CalendarDays, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCentral } from '@/contexts/CentralContext';

const tabs = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/inbox', icon: Inbox, label: 'Inbox' },
  { path: '/items', icon: List, label: 'Items' },
  { path: '/agenda', icon: CalendarDays, label: 'Agenda' },
  { path: '/settings', icon: Settings, label: 'Config' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { inbox } = useCentral();
  const pendingCount = inbox.filter(e => e.status === 'pending').length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors relative',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {label === 'Inbox' && pendingCount > 0 && (
                <span className="absolute -top-0.5 right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
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
