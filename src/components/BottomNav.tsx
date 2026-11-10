import { CalendarDays, Wallet, Repeat } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/hoje', icon: CalendarDays, label: 'Hoje', prefetch: () => import('@/pages/TodayPage') },
  { path: '/dinheiro', icon: Wallet, label: 'Dinheiro', prefetch: () => import('@/pages/MoneyPage') },
  { path: '/rotinas', icon: Repeat, label: 'Rotinas', prefetch: () => import('@/pages/MemoryPage') },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <nav aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch justify-around h-[68px] max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label, prefetch }) => {
          const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
          return (
            <button key={path} onClick={() => navigate(path)} onPointerDown={() => { prefetch().catch(() => {}); }}
              aria-current={active ? 'page' : undefined} aria-label={label}
              className={cn('flex-1 flex flex-col items-center justify-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md',
                active ? 'text-primary' : 'text-muted-foreground')}>
              <span className={cn('h-8 w-14 rounded-full flex items-center justify-center transition', active && 'bg-primary/10')}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
              </span>
              <span className="text-xs font-semibold leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
