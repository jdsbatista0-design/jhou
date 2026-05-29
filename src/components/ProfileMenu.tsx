import { useNavigate } from 'react-router-dom';
import { LogOut, BarChart3, BookHeart, Settings as SettingsIcon, LayoutDashboard, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface ProfileMenuProps {
  email?: string;
  avatarUrl?: string;
  fullName?: string;
}

export default function ProfileMenu({ email, avatarUrl, fullName }: ProfileMenuProps) {
  const navigate = useNavigate();
  const initials = (fullName || email || 'U').slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu de perfil"
        className="tap-target inline-flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="h-9 w-9 border border-surface-2">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName || 'Perfil'} /> : null}
          <AvatarFallback className="bg-surface text-foreground text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {fullName || email || 'Conta'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/painel')} className="cursor-pointer">
          <LayoutDashboard className="h-4 w-4 mr-2" /> Painel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/memoria')} className="cursor-pointer">
          <BookHeart className="h-4 w-4 mr-2" /> Memória
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/relatorios')} className="cursor-pointer">
          <BarChart3 className="h-4 w-4 mr-2" /> Relatórios
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="cursor-pointer">
          <SettingsIcon className="h-4 w-4 mr-2" /> Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
