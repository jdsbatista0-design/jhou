import { CalendarDays, Wallet, Repeat } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/agenda', icon: CalendarDays, label: 'Agenda', prefetch: () => import('@/pages/AgendaPage') },
  { path: '/financas', icon: Wallet, label: 'Finanças', prefetch: () => import('@/pages/FinancePage') },
  { path: '/memory', icon: Repeat, label: 'Rotinas', prefetch: () => import('@/pages/MemoryPage') },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label, prefetch }) => {
          const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              onPointerDown={() => { prefetch?.().catch(() => {}); }}
              onMouseEnter={() => { prefetch?.().catch(() => {}); }}
              onTouchStart={() => { prefetch?.().catch(() => {}); }}
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
            </button>
          );
        })}
      </div>
    </nav>
  );
}
