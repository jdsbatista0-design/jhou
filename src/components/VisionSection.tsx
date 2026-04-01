import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisionSectionProps {
  title: string;
  icon: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function VisionSection({ title, icon, count, children, defaultOpen = true }: VisionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left group">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground ml-auto transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}
