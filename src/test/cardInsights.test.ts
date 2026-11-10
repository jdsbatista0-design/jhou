import { describe, it, expect } from 'vitest';
import { splitStatement, endingInstallments, rankBy, recurringMerchants, normalizeMerchant } from '@/lib/cardInsights';

const tx = (amount: number, description: string, no?: number, total?: number, categoryId: string | null = null) =>
  ({ amount, description, installmentNo: no, installmentTotal: total, categoryId, purchaseGroupId: null }) as any;

describe('cardInsights', () => {
  it('separa parcelas de compras novas', () => {
    expect(splitStatement([tx(100, 'A', 2, 5), tx(50, 'B')])).toEqual({ installments: 100, purchases: 50 });
  });
  it('detecta parcelas que terminam na fatura', () => {
    expect(endingInstallments([tx(874, 'Vidraçaria', 3, 3), tx(10, 'X', 1, 3)]).map(t => t.amount)).toEqual([874]);
  });
  it('normaliza estabelecimento removendo número da parcela', () => {
    expect(normalizeMerchant('Mercado*Livre (2/6)')).toBe('MERCADO LIVRE');
  });
  it('ranqueia com média mensal e variação', () => {
    const r = rankBy([tx(300, 'a', undefined, undefined, 'c1')], [tx(200, 'b', undefined, undefined, 'c1')], t => t.categoryId, t => t.amount, 3);
    expect(r[0]).toMatchObject({ key: 'c1', total: 300, avg: 100, deltaPct: 50 });
  });
  it('gasto repetido só a partir de 3 meses', () => {
    const m = (iso: string) => ({ monthISO: iso, txs: [tx(340, 'Inglês')] });
    expect(recurringMerchants([m('2026-01'), m('2026-02')])).toHaveLength(0);
    expect(recurringMerchants([m('2026-01'), m('2026-02'), m('2026-03')])[0].yearly).toBe(4080);
  });
});
