import { ReactNode, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { supabase } from '@/integrations/supabase/client';
import ProfileMenu from './ProfileMenu';
import BottomNav from './BottomNav';
import CaptureFAB from './CaptureFAB';

interface AppShellProps {
  children: ReactNode;
}

function greeting(hour: number) {
  if (hour < 5) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function AppShell({ children }: AppShellProps) {
  const [profile, setProfile] = useState<{ email?: string; fullName?: string; avatarUrl?: string }>({});

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const meta = data.user.user_metadata || {};
      setProfile({
        email: data.user.email || undefined,
        fullName: meta.full_name || meta.name,
        avatarUrl: meta.avatar_url || meta.picture,
      });
    });
    return () => { active = false; };
  }, []);

  const now = new Date();
  const firstName = profile.fullName?.split(' ')[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b border-surface-2">
        <div className="max-w-lg mx-auto h-full px-3 flex items-center gap-2">
          <ProfileMenu email={profile.email} fullName={profile.fullName} avatarUrl={profile.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground leading-tight truncate hidden xs:block">
              {greeting(now.getHours())}{firstName ? `, ${firstName}` : ''}
            </p>
            <p className="text-[12px] font-medium text-foreground leading-tight truncate" data-mono>
              {format(now, "EEE, dd MMM", { locale: ptBR })}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {children}
      </main>

      <CaptureFAB />
      <BottomNav />
    </div>
  );
}
