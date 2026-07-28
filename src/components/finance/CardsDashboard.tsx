import { FinScope } from '@/types/finance';
import { CardsSummary } from './CardsSummary';
import { CardsForecast } from './CardsForecast';
import { CardsTopCategories } from './CardsTopCategories';
import { CardsManager } from './CardsManager';

interface Props { scope: FinScope; companyId: string | null; }

export function CardsDashboard({ scope, companyId }: Props) {
  return (
    <div className="space-y-3">
      <CardsSummary />
      <CardsForecast />
      <CardsTopCategories />
      <div className="pt-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pb-1.5 px-0.5">
          Seus cartões
        </div>
        <CardsManager scope={scope} companyId={companyId} />
      </div>
    </div>
  );
}
