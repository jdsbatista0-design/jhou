import { Sun, Inbox as InboxIcon, CalendarDays, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCentral } from '@/contexts/CentralContext';

const tabs = [
  { path: '/', icon: Sun, label: 'Hoje' },
  { path: '/inbox', icon: InboxIcon, label: 'Inbox' },
  { path: '/agenda', icon: CalendarDays, label: 'Agenda' },
  { path: '/financas', icon: Wallet, label: 'Financeiro' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { inbox } = useCentral();
  const pendingCount = inbox.filter(e => e.status === 'pending').length;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = path === '/'
            ? location.pathname === '/'
            : location.pathname === path || location.pathname.startsWith(`${path}/`);
          const showBadge = label === 'Inbox' && pendingCount > 0;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={cn(
                'tap-target flex-1 flex flex-col items-center justify-center gap-1 relative cursor-pointer',
                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
              <span className="text-[10px] font-medium leading-none">{label}</span>
              {showBadge && (
                <span className="absolute top-1.5 right-1/2 translate-x-[18px] h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold" data-mono>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
