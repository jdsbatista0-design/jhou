import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const pad2 = (n: number) => String(n).padStart(2, '0');
export const currentMonthISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

const parseISO = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return { y, m: m - 1 };
};

const monthStartYMD = (iso: string) => {
  const { y, m } = parseISO(iso);
  return new Date(y, m, 1).toISOString().slice(0, 10);
};
const monthEndYMD = (iso: string) => {
  const { y, m } = parseISO(iso);
  return new Date(y, m + 1, 0).toISOString().slice(0, 10);
};

const addMonths = (iso: string, delta: number) => {
  const { y, m } = parseISO(iso);
  const d = new Date(y, m + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

const formatMonthLabel = (iso: string) => {
  const { y, m } = parseISO(iso);
  const s = new Date(y, m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

interface Ctx {
  monthISO: string;
  monthStart: string;
  monthEnd: string;
  isCurrentMonth: boolean;
  label: string;
  setMonth: (iso: string) => void;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
}

const FinancePeriodContext = createContext<Ctx | null>(null);

export function FinancePeriodProvider({ children }: { children: React.ReactNode }) {
  const [monthISO, setMonthISO] = useState<string>(() => currentMonthISO());

  const setMonth = useCallback((iso: string) => setMonthISO(iso), []);
  const goPrev = useCallback(() => setMonthISO(prev => addMonths(prev, -1)), []);
  const goNext = useCallback(() => setMonthISO(prev => addMonths(prev, 1)), []);
  const goToday = useCallback(() => setMonthISO(currentMonthISO()), []);

  const value = useMemo<Ctx>(() => ({
    monthISO,
    monthStart: monthStartYMD(monthISO),
    monthEnd: monthEndYMD(monthISO),
    isCurrentMonth: monthISO === currentMonthISO(),
    label: formatMonthLabel(monthISO),
    setMonth, goPrev, goNext, goToday,
  }), [monthISO, setMonth, goPrev, goNext, goToday]);

  return (
    <FinancePeriodContext.Provider value={value}>
      {children}
    </FinancePeriodContext.Provider>
  );
}

export function useFinancePeriod() {
  const ctx = useContext(FinancePeriodContext);
  if (!ctx) throw new Error('useFinancePeriod must be used inside FinancePeriodProvider');
  return ctx;
}
