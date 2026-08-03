import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FinScope } from '@/types/finance';
import { CardsOverview } from './CardsOverview';
import { CardsForecast } from './CardsForecast';
import { CardsTopCategories } from './CardsTopCategories';
import { CardsManager } from './CardsManager';
import { CardDetailSheet } from './CardDetailSheet';

interface Props { scope: FinScope; companyId: string | null; }

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  );
}

export function CardsDashboard({ scope, companyId }: Props) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <CardsOverview scope={scope} companyId={companyId} />

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pb-1.5 px-0.5">
          Seus cartões
        </div>
        <CardsManager scope={scope} companyId={companyId} onOpenCard={setOpenCardId} />
      </div>

      <Section title="Próximos meses">
        <CardsForecast />
      </Section>

      <Section title="Onde você mais gasta">
        <CardsTopCategories />
      </Section>

      <CardDetailSheet
        cardId={openCardId}
        scope={scope}
        companyId={companyId}
        onClose={() => setOpenCardId(null)}
      />
    </div>
  );
}
