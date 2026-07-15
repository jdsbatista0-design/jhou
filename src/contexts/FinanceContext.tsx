import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  FinAccount,
  FinCard,
  FinCategory,
  FinCompany,
  FinPerson,
  FinRecurrence,
  FinScope,
  FinTransaction,
  DEFAULT_PF_CATEGORIES,
  DEFAULT_PJ_CATEGORIES,
} from '@/types/finance';

// ---------- DB row mappers ----------
const rowCompany = (r: any): FinCompany => ({
  id: r.id, name: r.name, cnpj: r.cnpj || undefined, color: r.color,
  archived: r.archived, createdAt: r.created_at,
});
const rowAccount = (r: any): FinAccount => ({
  id: r.id, scope: r.scope, companyId: r.company_id || undefined, name: r.name,
  bank: r.bank || undefined, type: r.type, initialBalance: Number(r.initial_balance ?? 0),
  color: r.color, archived: r.archived, createdAt: r.created_at,
});
const rowCard = (r: any): FinCard => ({
  id: r.id, scope: r.scope, companyId: r.company_id || undefined,
  accountId: r.account_id || undefined, name: r.name, brand: r.brand || undefined,
  limitAmount: Number(r.limit_amount ?? 0), closingDay: r.closing_day || undefined,
  dueDay: r.due_day || undefined, color: r.color, archived: r.archived, createdAt: r.created_at,
  statementOverrides: (r.statement_overrides && typeof r.statement_overrides === 'object')
    ? r.statement_overrides as Record<string, number> : {},
});

const rowCategory = (r: any): FinCategory => ({
  id: r.id, scope: r.scope, name: r.name, kind: r.kind, color: r.color,
  icon: r.icon || undefined, archived: r.archived,
  monthlyBudget: r.monthly_budget != null ? Number(r.monthly_budget) : undefined,
});
const rowPerson = (r: any): FinPerson => ({
  id: r.id, companyId: r.company_id || undefined, name: r.name, role: r.role,
  document: r.document || undefined, note: r.note || undefined, archived: r.archived,
});
const rowRecurrence = (r: any): FinRecurrence => ({
  id: r.id, scope: r.scope, companyId: r.company_id || undefined,
  accountId: r.account_id || undefined, cardId: r.card_id || undefined,
  categoryId: r.category_id || undefined, description: r.description,
  amount: Number(r.amount), kind: r.kind, frequency: r.frequency,
  dayOfMonth: r.day_of_month || undefined, startOn: r.start_on,
  endOn: r.end_on || undefined, active: r.active,
  lastGeneratedOn: r.last_generated_on || undefined,
});
const rowTransaction = (r: any): FinTransaction => ({
  id: r.id, scope: r.scope, companyId: r.company_id || undefined,
  accountId: r.account_id || undefined, cardId: r.card_id || undefined,
  categoryId: r.category_id || undefined, personId: r.person_id || undefined,
  recurrenceId: r.recurrence_id || undefined, transferId: r.transfer_id || undefined,
  kind: r.kind, amount: Number(r.amount), description: r.description,
  occurredOn: r.occurred_on, status: r.status, attachmentUrl: r.attachment_url || undefined,
  notes: r.notes || undefined, source: r.source, createdAt: r.created_at,
  installmentNo: r.installment_no ?? undefined,
  installmentTotal: r.installment_total ?? undefined,
  purchaseGroupId: r.purchase_group_id ?? undefined,
  paidCardMonth: r.paid_card_month ?? undefined,
});

interface FinanceContextType {
  loading: boolean;
  companies: FinCompany[];
  accounts: FinAccount[];
  cards: FinCard[];
  categories: FinCategory[];
  people: FinPerson[];
  recurrences: FinRecurrence[];
  transactions: FinTransaction[];
  // selection
  scope: FinScope;
  setScope: (s: FinScope) => void;
  selectedCompanyId: string | null; // 'all' represented as null when scope=pj? we use string|null for explicit
  setSelectedCompanyId: (id: string | null) => void;
  // CRUD
  addCompany: (data: { name: string; cnpj?: string; color?: string }) => Promise<void>;
  updateCompany: (id: string, data: Partial<FinCompany>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  addAccount: (data: Omit<FinAccount, 'id' | 'createdAt' | 'archived'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<FinAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addCard: (data: Omit<FinCard, 'id' | 'createdAt' | 'archived'>) => Promise<void>;
  updateCard: (id: string, data: Partial<FinCard>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  setCardStatementOverride: (cardId: string, monthISO: string, amount: number | null) => Promise<void>;

  addCategory: (data: Omit<FinCategory, 'id' | 'archived'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<FinCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addPerson: (data: Omit<FinPerson, 'id' | 'archived'>) => Promise<void>;
  updatePerson: (id: string, data: Partial<FinPerson>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  addTransaction: (data: Omit<FinTransaction, 'id' | 'createdAt' | 'source'> & { source?: FinTransaction['source'] }) => Promise<void>;
  updateTransaction: (id: string, data: Partial<FinTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteTransactionAndFuture: (id: string) => Promise<void>;
  // Recurrences
  addRecurrence: (data: Omit<FinRecurrence, 'id' | 'active' | 'lastGeneratedOn'> & { active?: boolean }) => Promise<string | null>;
  updateRecurrence: (id: string, data: Partial<FinRecurrence>) => Promise<void>;
  deleteRecurrence: (id: string, alsoDeleteFutureTx?: boolean) => Promise<void>;
  // Compound: transfer between accounts (creates 2 rows)
  addTransferBetweenAccounts: (data: {
    scope: FinScope; companyId?: string; fromAccountId: string; toAccountId: string;
    amount: number; description: string; occurredOn: string;
  }) => Promise<void>;
  addInterCompanyTransfer: (data: {
    fromCompanyId: string; fromAccountId: string;
    toCompanyId: string; toAccountId: string;
    amount: number; description: string; occurredOn: string;
  }) => Promise<void>;
  // Compound: card operations
  addInstallmentPurchase: (data: {
    scope: FinScope; companyId?: string; cardId: string; categoryId?: string;
    description: string; totalAmount: number; installments: number; firstOccurredOn: string;
    status?: 'pending' | 'confirmed'; notes?: string;
  }) => Promise<void>;
  addCardPayment: (data: {
    scope: FinScope; companyId?: string; cardId: string; accountId: string;
    amount: number; paidCardMonth: string; occurredOn: string; description?: string;
  }) => Promise<void>;
  convertToCardPayment: (transactionId: string, cardId: string, paidCardMonth: string) => Promise<void>;
  // Computed helpers
  accountBalance: (accountId: string) => number;
  cardOpenInvoice: (cardId: string) => number;
  getMonthTotals: (monthISO: string) => {
    pago: number; recebido: number; aPagar: number; aReceber: number; saldo: number;
    pagamentosFatura: number;
  };
  getUpcomingBills: (days: number) => FinTransaction[];
  getCategoryTotals: (monthISO: string) => Array<{
    categoryId: string | null; name: string; color: string; total: number;
  }>;
  getYearMatrix: (year: number) => {
    categories: FinCategory[];
    months: string[];
    expenseMatrix: number[][];
    incomeMatrix: number[][];
  };
  // Card statement helpers
  getCardStatement: (cardId: string, monthISO: string) => {
    start: string; end: string; due: string | null;
    total: number; paid: number; remaining: number;
    status: 'open' | 'closed' | 'paid' | 'partial';
    transactions: FinTransaction[];
  };
  getCardCategoryBreakdown: (cardId: string, monthISO: string) => Array<{
    categoryId: string | null; name: string; color: string; total: number; pct: number;
    deltaPct: number | null; // vs previous invoice; null = no comparison
  }>;
  getCardActiveInstallments: (cardId: string) => Array<{
    purchaseGroupId: string; description: string; installmentAmount: number;
    total: number; paidCount: number; remaining: number; endsNextMonth: boolean;
    nextDueOn: string | null;
  }>;
  getCardPaymentsForMonth: (monthISO: string) => number;
}


const FinanceContext = createContext<FinanceContextType | null>(null);

function loadCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache is best-effort only.
  }
}

// Idle-deferred persistence — never blocks the main thread
const ric: (cb: () => void) => number =
  typeof (globalThis as any).requestIdleCallback === 'function'
    ? (cb) => (globalThis as any).requestIdleCallback(cb, { timeout: 1500 })
    : (cb) => window.setTimeout(cb, 200) as unknown as number;

export function FinanceProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const cachePrefix = `fin:${userId}:`;
  // userId vem da prop — não chamamos auth.getUser() em cada ação
  const getUserId = useCallback(async (): Promise<string | null> => userId, [userId]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<FinCompany[]>(() => loadCache(`${cachePrefix}companies`, []));
  const [accounts, setAccounts] = useState<FinAccount[]>(() => loadCache(`${cachePrefix}accounts`, []));
  const [cards, setCards] = useState<FinCard[]>(() => loadCache(`${cachePrefix}cards`, []));
  const [categories, setCategories] = useState<FinCategory[]>(() => loadCache(`${cachePrefix}categories`, []));
  const [people, setPeople] = useState<FinPerson[]>(() => loadCache(`${cachePrefix}people`, []));
  const [recurrences, setRecurrences] = useState<FinRecurrence[]>(() => loadCache(`${cachePrefix}recurrences`, []));
  const [transactions, setTransactions] = useState<FinTransaction[]>(() => loadCache(`${cachePrefix}transactions`, []));

  const [scope, setScopeState] = useState<FinScope>(() => (localStorage.getItem('fin_scope') as FinScope) || 'pf');
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(
    () => localStorage.getItem('fin_company_id'),
  );

  const setScope = useCallback((s: FinScope) => {
    setScopeState(s);
    localStorage.setItem('fin_scope', s);
  }, []);
  const setSelectedCompanyId = useCallback((id: string | null) => {
    setSelectedCompanyIdState(id);
    if (id) localStorage.setItem('fin_company_id', id);
    else localStorage.removeItem('fin_company_id');
  }, []);

  // ---------- Refresh granular (por tabela) ----------
  const refreshCompanies = useCallback(async () => {
    const { data } = await supabase.from('fin_companies').select('*').order('created_at', { ascending: true });
    if (data) setCompanies(data.map(rowCompany));
  }, []);
  const refreshAccounts = useCallback(async () => {
    const { data } = await supabase.from('fin_accounts').select('*').order('created_at', { ascending: true });
    if (data) setAccounts(data.map(rowAccount));
  }, []);
  const refreshCards = useCallback(async () => {
    const { data } = await supabase.from('fin_cards').select('*').order('created_at', { ascending: true });
    if (data) setCards(data.map(rowCard));
  }, []);
  const refreshCategories = useCallback(async () => {
    const { data } = await supabase.from('fin_categories').select('*').order('name', { ascending: true });
    if (data) setCategories(data.map(rowCategory));
  }, []);
  const refreshPeople = useCallback(async () => {
    const { data } = await supabase.from('fin_people').select('*').order('name', { ascending: true });
    if (data) setPeople(data.map(rowPerson));
  }, []);
  const refreshRecurrences = useCallback(async () => {
    const { data } = await supabase.from('fin_recurrences').select('*').order('created_at', { ascending: true });
    if (data) setRecurrences(data.map(rowRecurrence));
  }, []);
  const refreshTransactions = useCallback(async () => {
    const { data } = await supabase.from('fin_transactions')
      .select('*').order('occurred_on', { ascending: false }).limit(2000);
    if (data) setTransactions(data.map(rowTransaction));
  }, []);

  useEffect(() => { ric(() => saveCache(`${cachePrefix}companies`, companies)); }, [cachePrefix, companies]);
  useEffect(() => { ric(() => saveCache(`${cachePrefix}accounts`, accounts)); }, [cachePrefix, accounts]);
  useEffect(() => { ric(() => saveCache(`${cachePrefix}cards`, cards)); }, [cachePrefix, cards]);
  useEffect(() => { ric(() => saveCache(`${cachePrefix}categories`, categories)); }, [cachePrefix, categories]);
  useEffect(() => { ric(() => saveCache(`${cachePrefix}people`, people)); }, [cachePrefix, people]);
  useEffect(() => { ric(() => saveCache(`${cachePrefix}recurrences`, recurrences)); }, [cachePrefix, recurrences]);
  useEffect(() => { ric(() => saveCache(`${cachePrefix}transactions`, transactions)); }, [cachePrefix, transactions]);

  // Debounce helper — agrupa eventos realtime em rajadas
  const debouncedRef = React.useRef<Record<string, number>>({});
  const debouncedRefresh = useCallback((key: string, fn: () => void) => {
    if (debouncedRef.current[key]) window.clearTimeout(debouncedRef.current[key]);
    debouncedRef.current[key] = window.setTimeout(() => {
      fn();
      delete debouncedRef.current[key];
    }, 400);
  }, []);

  // Boot: carrega tudo em paralelo de uma só vez
  const initialLoad = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      refreshCompanies(),
      refreshAccounts(),
      refreshCards(),
      refreshCategories(),
      refreshPeople(),
      refreshRecurrences(),
      refreshTransactions(),
    ]);
    setLoading(false);
  }, [refreshCompanies, refreshAccounts, refreshCards, refreshCategories, refreshPeople, refreshRecurrences, refreshTransactions]);

  // ---------- Seed default categories on first load ----------
  const seedDefaultCategoriesIfNeeded = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase.from('fin_categories').select('id').limit(1);
    if (data && data.length > 0) return;
    const rows = [
      ...DEFAULT_PF_CATEGORIES.map(c => ({ ...c, scope: 'pf' as const, user_id: userId })),
      ...DEFAULT_PJ_CATEGORIES.map(c => ({ ...c, scope: 'pj' as const, user_id: userId })),
    ];
    await supabase.from('fin_categories').insert(rows);
  }, []);

  // ---------- Auto-generate pending occurrences for active recurrences ----------
  // Generates from last_generated_on (or start_on) up to today + 30 days.
  const generatePendingRecurrences = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { data: recs } = await supabase
      .from('fin_recurrences').select('*').eq('active', true);
    if (!recs || recs.length === 0) return;

    const today = new Date();
    const horizon = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

    const toInsert: any[] = [];
    const lastGenUpdates: Array<{ id: string; date: string }> = [];

    const advance = (d: Date, freq: string): Date => {
      const n = new Date(d);
      if (freq === 'weekly') n.setDate(n.getDate() + 7);
      else if (freq === 'yearly') n.setFullYear(n.getFullYear() + 1);
      else n.setMonth(n.getMonth() + 1);
      return n;
    };

    for (const r of recs) {
      const startOn = new Date(r.start_on + 'T00:00:00');
      const endOn = r.end_on ? new Date(r.end_on + 'T00:00:00') : null;
      let cursor = r.last_generated_on
        ? advance(new Date(r.last_generated_on + 'T00:00:00'), r.frequency)
        : new Date(startOn);

      let lastGen: string | null = r.last_generated_on || null;
      let safety = 0;
      while (cursor <= horizon && safety < 60) {
        safety++;
        if (endOn && cursor > endOn) break;
        const ymd = cursor.toISOString().slice(0, 10);
        toInsert.push({
          user_id: userId,
          scope: r.scope,
          company_id: r.company_id,
          account_id: r.account_id,
          card_id: r.card_id,
          category_id: r.category_id,
          recurrence_id: r.id,
          kind: r.kind,
          amount: r.amount,
          description: r.description,
          occurred_on: ymd,
          status: 'pending',
          source: 'recurrence',
        });
        lastGen = ymd;
        cursor = advance(cursor, r.frequency);
      }
      if (lastGen && lastGen !== r.last_generated_on) {
        lastGenUpdates.push({ id: r.id, date: lastGen });
      }
    }

    if (toInsert.length > 0) {
      await supabase.from('fin_transactions').insert(toInsert);
    }
    // Atualiza last_generated_on em paralelo
    if (lastGenUpdates.length > 0) {
      await Promise.all(lastGenUpdates.map(u =>
        supabase.from('fin_recurrences').update({ last_generated_on: u.date }).eq('id', u.id)
      ));
    }
  }, []);

  useEffect(() => {
    // Mostra dados o quanto antes; recorrências e seed rodam em background bem depois do boot
    initialLoad();
    // Background: adiado para não competir com Central + render inicial
    const bgTimer = window.setTimeout(() => {
      (async () => {
        await seedDefaultCategoriesIfNeeded();
        await generatePendingRecurrences();
        refreshTransactions();
        refreshRecurrences();
        refreshCategories();
      })();
    }, 4000);

    // Realtime granular + debounced
    const ch = supabase
      .channel('fin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_companies' },
        () => debouncedRefresh('companies', refreshCompanies))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_accounts' },
        () => debouncedRefresh('accounts', refreshAccounts))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_cards' },
        () => debouncedRefresh('cards', refreshCards))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_categories' },
        () => debouncedRefresh('categories', refreshCategories))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_people' },
        () => debouncedRefresh('people', refreshPeople))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_recurrences' },
        () => debouncedRefresh('recurrences', refreshRecurrences))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_transactions' },
        () => debouncedRefresh('transactions', refreshTransactions))
      .subscribe();

    return () => { window.clearTimeout(bgTimer); supabase.removeChannel(ch); };
  }, [initialLoad, seedDefaultCategoriesIfNeeded, generatePendingRecurrences,
      refreshCompanies, refreshAccounts, refreshCards, refreshCategories,
      refreshPeople, refreshRecurrences, refreshTransactions, debouncedRefresh]);

  // ---------- Companies ----------
  const addCompany: FinanceContextType['addCompany'] = async ({ name, cnpj, color }) => {
    const userId = await getUserId(); if (!userId) return;
    await supabase.from('fin_companies').insert({ name, cnpj: cnpj || null, color: color || '#6366f1', user_id: userId });
  };
  const updateCompany: FinanceContextType['updateCompany'] = async (id, data) => {
    await supabase.from('fin_companies').update({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.cnpj !== undefined ? { cnpj: data.cnpj || null } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.archived !== undefined ? { archived: data.archived } : {}),
    }).eq('id', id);
  };
  const deleteCompany: FinanceContextType['deleteCompany'] = async (id) => {
    await supabase.from('fin_companies').delete().eq('id', id);
  };

  // ---------- Accounts ----------
  const addAccount: FinanceContextType['addAccount'] = async (a) => {
    const userId = await getUserId(); if (!userId) return;
    await supabase.from('fin_accounts').insert({
      scope: a.scope, company_id: a.companyId || null, name: a.name, bank: a.bank || null,
      type: a.type, initial_balance: a.initialBalance, color: a.color || '#0ea5e9', user_id: userId,
    });
  };
  const updateAccount: FinanceContextType['updateAccount'] = async (id, data) => {
    await supabase.from('fin_accounts').update({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.bank !== undefined ? { bank: data.bank || null } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.initialBalance !== undefined ? { initial_balance: data.initialBalance } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.archived !== undefined ? { archived: data.archived } : {}),
    }).eq('id', id);
  };
  const deleteAccount: FinanceContextType['deleteAccount'] = async (id) => {
    await supabase.from('fin_accounts').delete().eq('id', id);
  };

  // ---------- Cards ----------
  const addCard: FinanceContextType['addCard'] = async (c) => {
    const userId = await getUserId(); if (!userId) return;
    await supabase.from('fin_cards').insert({
      scope: c.scope, company_id: c.companyId || null, account_id: c.accountId || null,
      name: c.name, brand: c.brand || null, limit_amount: c.limitAmount,
      closing_day: c.closingDay || null, due_day: c.dueDay || null,
      color: c.color || '#a855f7', user_id: userId,
    });
  };
  const updateCard: FinanceContextType['updateCard'] = async (id, data) => {
    await supabase.from('fin_cards').update({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.brand !== undefined ? { brand: data.brand || null } : {}),
      ...(data.accountId !== undefined ? { account_id: data.accountId || null } : {}),
      ...(data.limitAmount !== undefined ? { limit_amount: data.limitAmount } : {}),
      ...(data.closingDay !== undefined ? { closing_day: data.closingDay || null } : {}),
      ...(data.dueDay !== undefined ? { due_day: data.dueDay || null } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.archived !== undefined ? { archived: data.archived } : {}),
    }).eq('id', id);
  };
  const deleteCard: FinanceContextType['deleteCard'] = async (id) => {
    await supabase.from('fin_cards').delete().eq('id', id);
  };
  const setCardStatementOverride: FinanceContextType['setCardStatementOverride'] = async (cardId, monthISO, amount) => {
    const card = cards.find(c => c.id === cardId);
    const next: Record<string, number> = { ...(card?.statementOverrides || {}) };
    if (amount == null || !isFinite(amount)) delete next[monthISO];
    else next[monthISO] = amount;
    await supabase.from('fin_cards').update({ statement_overrides: next as any }).eq('id', cardId);
  };


  // ---------- Categories ----------
  const addCategory: FinanceContextType['addCategory'] = async (c) => {
    const userId = await getUserId(); if (!userId) return;
    await supabase.from('fin_categories').insert({
      scope: c.scope, name: c.name, kind: c.kind, color: c.color || '#64748b',
      icon: c.icon || null, monthly_budget: c.monthlyBudget ?? null, user_id: userId,
    } as any);
  };
  const updateCategory: FinanceContextType['updateCategory'] = async (id, data) => {
    await supabase.from('fin_categories').update({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.kind !== undefined ? { kind: data.kind } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.icon !== undefined ? { icon: data.icon || null } : {}),
      ...(data.archived !== undefined ? { archived: data.archived } : {}),
      ...(data.monthlyBudget !== undefined ? { monthly_budget: data.monthlyBudget ?? null } : {}),
    } as any).eq('id', id);
  };
  const deleteCategory: FinanceContextType['deleteCategory'] = async (id) => {
    await supabase.from('fin_categories').delete().eq('id', id);
  };

  // ---------- People ----------
  const addPerson: FinanceContextType['addPerson'] = async (p) => {
    const userId = await getUserId(); if (!userId) return;
    await supabase.from('fin_people').insert({
      company_id: p.companyId || null, name: p.name, role: p.role,
      document: p.document || null, note: p.note || null, user_id: userId,
    });
  };
  const updatePerson: FinanceContextType['updatePerson'] = async (id, data) => {
    await supabase.from('fin_people').update({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.document !== undefined ? { document: data.document || null } : {}),
      ...(data.note !== undefined ? { note: data.note || null } : {}),
      ...(data.archived !== undefined ? { archived: data.archived } : {}),
    }).eq('id', id);
  };
  const deletePerson: FinanceContextType['deletePerson'] = async (id) => {
    await supabase.from('fin_people').delete().eq('id', id);
  };

  // ---------- Transactions ----------
  const addTransaction: FinanceContextType['addTransaction'] = async (t) => {
    const userId = await getUserId(); if (!userId) return;
    await supabase.from('fin_transactions').insert({
      scope: t.scope, company_id: t.companyId || null, account_id: t.accountId || null,
      card_id: t.cardId || null, category_id: t.categoryId || null,
      person_id: t.personId || null, recurrence_id: t.recurrenceId || null,
      transfer_id: t.transferId || null, kind: t.kind, amount: t.amount,
      description: t.description, occurred_on: t.occurredOn, status: t.status || 'confirmed',
      attachment_url: t.attachmentUrl || null, notes: t.notes || null,
      source: t.source || 'manual', user_id: userId,
      installment_no: t.installmentNo ?? null,
      installment_total: t.installmentTotal ?? null,
      purchase_group_id: t.purchaseGroupId ?? null,
      paid_card_month: t.paidCardMonth ?? null,
    } as any);
  };
  const updateTransaction: FinanceContextType['updateTransaction'] = async (id, data) => {
    const upd: any = {};
    if (data.amount !== undefined) upd.amount = data.amount;
    if (data.description !== undefined) upd.description = data.description;
    if (data.occurredOn !== undefined) upd.occurred_on = data.occurredOn;
    if (data.status !== undefined) upd.status = data.status;
    if (data.categoryId !== undefined) upd.category_id = data.categoryId || null;
    if (data.personId !== undefined) upd.person_id = data.personId || null;
    if (data.accountId !== undefined) upd.account_id = data.accountId || null;
    if (data.cardId !== undefined) upd.card_id = data.cardId || null;
    if (data.notes !== undefined) upd.notes = data.notes || null;
    if (data.kind !== undefined) upd.kind = data.kind;
    if (data.paidCardMonth !== undefined) upd.paid_card_month = data.paidCardMonth || null;
    await supabase.from('fin_transactions').update(upd).eq('id', id);
  };
  const deleteTransaction: FinanceContextType['deleteTransaction'] = async (id) => {
    // If part of a transfer, delete both rows
    const { data: t } = await supabase.from('fin_transactions').select('transfer_id').eq('id', id).maybeSingle();
    if (t?.transfer_id) {
      await supabase.from('fin_transactions').delete().eq('transfer_id', t.transfer_id);
    } else {
      await supabase.from('fin_transactions').delete().eq('id', id);
    }
  };

  const deleteTransactionAndFuture: FinanceContextType['deleteTransactionAndFuture'] = async (id) => {
    const { data: t } = await supabase.from('fin_transactions')
      .select('recurrence_id, occurred_on').eq('id', id).maybeSingle();
    if (!t?.recurrence_id) {
      await supabase.from('fin_transactions').delete().eq('id', id);
      return;
    }
    await supabase.from('fin_transactions').delete()
      .eq('recurrence_id', t.recurrence_id)
      .gte('occurred_on', t.occurred_on);
  };

  // ---------- Recurrences ----------
  const addRecurrence: FinanceContextType['addRecurrence'] = async (r) => {
    const userId = await getUserId(); if (!userId) return null;
    const { data, error } = await supabase.from('fin_recurrences').insert({
      scope: r.scope, company_id: r.companyId || null,
      account_id: r.accountId || null, card_id: r.cardId || null,
      category_id: r.categoryId || null, description: r.description,
      amount: r.amount, kind: r.kind, frequency: r.frequency,
      day_of_month: r.dayOfMonth || null, start_on: r.startOn,
      end_on: r.endOn || null, active: r.active !== false,
      user_id: userId,
    }).select('id').single();
    if (error) { console.error(error); return null; }
    return data?.id || null;
  };
  const updateRecurrence: FinanceContextType['updateRecurrence'] = async (id, data) => {
    const upd: any = {};
    if (data.description !== undefined) upd.description = data.description;
    if (data.amount !== undefined) upd.amount = data.amount;
    if (data.frequency !== undefined) upd.frequency = data.frequency;
    if (data.dayOfMonth !== undefined) upd.day_of_month = data.dayOfMonth || null;
    if (data.endOn !== undefined) upd.end_on = data.endOn || null;
    if (data.active !== undefined) upd.active = data.active;
    if (data.accountId !== undefined) upd.account_id = data.accountId || null;
    if (data.cardId !== undefined) upd.card_id = data.cardId || null;
    if (data.categoryId !== undefined) upd.category_id = data.categoryId || null;
    if (data.lastGeneratedOn !== undefined) upd.last_generated_on = data.lastGeneratedOn || null;
    await supabase.from('fin_recurrences').update(upd).eq('id', id);
  };
  const deleteRecurrence: FinanceContextType['deleteRecurrence'] = async (id, alsoDeleteFutureTx = true) => {
    if (alsoDeleteFutureTx) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from('fin_transactions').delete()
        .eq('recurrence_id', id).gte('occurred_on', today);
    }
    await supabase.from('fin_recurrences').delete().eq('id', id);
  };

  const addTransferBetweenAccounts: FinanceContextType['addTransferBetweenAccounts'] = async ({
    scope, companyId, fromAccountId, toAccountId, amount, description, occurredOn,
  }) => {
    const userId = await getUserId(); if (!userId) return;
    const transferId = crypto.randomUUID();
    await supabase.from('fin_transactions').insert([
      {
        user_id: userId, scope, company_id: companyId || null,
        account_id: fromAccountId, kind: 'transfer', amount,
        description: `${description} (saída)`, occurred_on: occurredOn,
        status: 'confirmed', source: 'manual', transfer_id: transferId,
      },
      {
        user_id: userId, scope, company_id: companyId || null,
        account_id: toAccountId, kind: 'transfer', amount: -amount,
        description: `${description} (entrada)`, occurred_on: occurredOn,
        status: 'confirmed', source: 'manual', transfer_id: transferId,
      },
    ]);
  };

  const addInterCompanyTransfer: FinanceContextType['addInterCompanyTransfer'] = async ({
    fromCompanyId, fromAccountId, toCompanyId, toAccountId, amount, description, occurredOn,
  }) => {
    const userId = await getUserId(); if (!userId) return;
    const transferId = crypto.randomUUID();
    await supabase.from('fin_transactions').insert([
      {
        user_id: userId, scope: 'pj', company_id: fromCompanyId,
        account_id: fromAccountId, kind: 'inter_company', amount,
        description: `${description} (saída)`, occurred_on: occurredOn,
        status: 'confirmed', source: 'manual', transfer_id: transferId,
      },
      {
        user_id: userId, scope: 'pj', company_id: toCompanyId,
        account_id: toAccountId, kind: 'inter_company', amount: -amount,
        description: `${description} (entrada)`, occurred_on: occurredOn,
        status: 'confirmed', source: 'manual', transfer_id: transferId,
      },
    ]);
  };

  // ---------- Computed ----------
  const signedAmount = useCallback((t: FinTransaction): number => {
    if (t.status !== 'confirmed') return 0;
    switch (t.kind) {
      case 'income':
      case 'receivable':
        return t.amount;
      case 'expense':
      case 'card_payment':
      case 'invoice_payment':
      case 'employee_payment':
      case 'supplier_payment':
      case 'employee_loan':
      case 'tax':
        return -t.amount;
      case 'bank_loan':
        return t.amount; // money entering
      case 'transfer':
      case 'inter_company':
        // saída row has +amount, entrada row has -amount → invert sign
        return -t.amount;
      default:
        return 0;
    }
  }, []);

  const accountBalance = useCallback((accountId: string): number => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return 0;
    const sum = transactions
      .filter(t => t.accountId === accountId)
      .reduce((s, t) => s + signedAmount(t), 0);
    return acc.initialBalance + sum;
  }, [accounts, transactions, signedAmount]);

  const cardOpenInvoice = useCallback((cardId: string): number => {
    // Sum of confirmed expenses on this card since last closing day
    const card = cards.find(c => c.id === cardId);
    if (!card) return 0;
    const today = new Date();
    let cutoff: Date;
    if (card.closingDay) {
      const d = new Date(today.getFullYear(), today.getMonth(), card.closingDay);
      cutoff = today.getDate() > card.closingDay
        ? new Date(today.getFullYear(), today.getMonth(), card.closingDay)
        : new Date(today.getFullYear(), today.getMonth() - 1, card.closingDay);
    } else {
      cutoff = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    return transactions
      .filter(t => t.cardId === cardId && t.status === 'confirmed' && t.kind === 'expense')
      .filter(t => new Date(t.occurredOn) > cutoff)
      .reduce((s, t) => s + t.amount, 0);
  }, [cards, transactions]);

  // ---------- Period helpers ----------
  // NOTE: 'card_payment' NÃO entra em EXPENSE_KINDS — as compras individuais no cartão
  // já foram contabilizadas como 'expense'. O pagamento da fatura é uma transferência
  // (banco → cartão) e é reportado separadamente como "pagamentosFatura".
  const EXPENSE_KINDS = useMemo(() => new Set([
    'expense', 'invoice_payment', 'employee_payment',
    'supplier_payment', 'employee_loan', 'tax',
  ]), []);
  const INCOME_KINDS = useMemo(() => new Set(['income', 'receivable', 'bank_loan']), []);
  const TRANSFER_KINDS = useMemo(() => new Set(['transfer', 'inter_company', 'card_payment']), []);

  const monthBounds = useCallback((monthISO: string) => {
    const [y, m] = monthISO.split('-').map(Number);
    const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
    const end = new Date(y, m, 0).toISOString().slice(0, 10);
    return { start, end };
  }, []);

  const currentMonthISOFn = useCallback(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const getMonthTotals = useCallback((monthISO: string) => {
    const { start, end } = monthBounds(monthISO);
    const isCurrent = monthISO === currentMonthISOFn();
    let pago = 0, recebido = 0, aPagar = 0, aReceber = 0, pagamentosFatura = 0;

    for (const t of transactions) {
      const inMonth = t.occurredOn >= start && t.occurredOn <= end;
      if (t.kind === 'card_payment') {
        if (t.status === 'confirmed' && inMonth) pagamentosFatura += t.amount;
        continue;
      }
      if (TRANSFER_KINDS.has(t.kind)) continue;
      const isExpense = EXPENSE_KINDS.has(t.kind);
      const isIncome = INCOME_KINDS.has(t.kind);

      if (t.status === 'confirmed' && inMonth) {
        if (isExpense) pago += t.amount;
        else if (isIncome) recebido += t.amount;
      } else if (t.status === 'pending') {
        if (inMonth) {
          if (isExpense) aPagar += t.amount;
          else if (isIncome) aReceber += t.amount;
        } else if (isCurrent && isExpense && t.occurredOn < start) {
          aPagar += t.amount;
        }
      }
    }
    return { pago, recebido, aPagar, aReceber, saldo: recebido - pago, pagamentosFatura };
  }, [transactions, monthBounds, currentMonthISOFn, EXPENSE_KINDS, INCOME_KINDS, TRANSFER_KINDS]);

  const getUpcomingBills = useCallback((days: number) => {
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(); horizon.setDate(horizon.getDate() + days);
    const end = horizon.toISOString().slice(0, 10);
    return transactions
      .filter(t => t.status === 'pending' && EXPENSE_KINDS.has(t.kind))
      .filter(t => t.occurredOn >= today && t.occurredOn <= end)
      .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
  }, [transactions, EXPENSE_KINDS]);

  const getCategoryTotals = useCallback((monthISO: string) => {
    const { start, end } = monthBounds(monthISO);
    const byId = new Map<string, number>();
    let uncategorized = 0;
    for (const t of transactions) {
      if (!EXPENSE_KINDS.has(t.kind)) continue;
      if (t.status !== 'confirmed') continue;
      if (t.occurredOn < start || t.occurredOn > end) continue;
      if (t.categoryId) byId.set(t.categoryId, (byId.get(t.categoryId) || 0) + t.amount);
      else uncategorized += t.amount;
    }
    const rows = categories
      .filter(c => c.kind === 'expense' && !c.archived)
      .map(c => ({
        categoryId: c.id as string | null,
        name: c.name,
        color: c.color,
        total: byId.get(c.id) || 0,
      }));
    if (uncategorized > 0) {
      rows.push({ categoryId: null, name: 'Sem categoria', color: '#94a3b8', total: uncategorized });
    }
    return rows.sort((a, b) => b.total - a.total);
  }, [transactions, categories, monthBounds, EXPENSE_KINDS]);

  const getYearMatrix = useCallback((year: number) => {
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    const activeCats = categories.filter(c => !c.archived);
    const catIndex = new Map(activeCats.map((c, i) => [c.id, i]));
    const expenseMatrix: number[][] = activeCats.map(() => Array(12).fill(0));
    const incomeMatrix: number[][] = activeCats.map(() => Array(12).fill(0));

    for (const t of transactions) {
      if (t.status !== 'confirmed') continue;
      if (!t.occurredOn.startsWith(String(year))) continue;
      const monthIdx = parseInt(t.occurredOn.slice(5, 7), 10) - 1;
      if (monthIdx < 0 || monthIdx > 11) continue;
      const catIdx = t.categoryId ? catIndex.get(t.categoryId) : undefined;
      if (catIdx === undefined) continue;
      if (EXPENSE_KINDS.has(t.kind)) expenseMatrix[catIdx][monthIdx] += t.amount;
      else if (INCOME_KINDS.has(t.kind)) incomeMatrix[catIdx][monthIdx] += t.amount;
    }
    return { categories: activeCats, months, expenseMatrix, incomeMatrix };
  }, [transactions, categories, EXPENSE_KINDS, INCOME_KINDS]);

  // ---------- Card statement helpers ----------
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const statementPeriod = useCallback((cardId: string, monthISO: string) => {
    const card = cards.find(c => c.id === cardId);
    const [y, m] = monthISO.split('-').map(Number);
    if (!card || !card.closingDay) {
      const start = `${monthISO}-01`;
      const end = new Date(y, m, 0).toISOString().slice(0, 10);
      const due = card?.dueDay ? ymd(new Date(y, m, card.dueDay)) : null;
      return { start, end, due };
    }
    const closing = new Date(y, m - 1, card.closingDay);
    const prevClosing = new Date(y, m - 2, card.closingDay);
    const startD = new Date(prevClosing); startD.setDate(startD.getDate() + 1);
    const due = card.dueDay ? ymd(new Date(y, m, card.dueDay)) : null;
    return { start: ymd(startD), end: ymd(closing), due };
  }, [cards]);

  const getCardStatement = useCallback((cardId: string, monthISO: string) => {
    const { start, end, due } = statementPeriod(cardId, monthISO);
    const txs = transactions.filter(t =>
      t.cardId === cardId && t.kind === 'expense' &&
      t.occurredOn >= start && t.occurredOn <= end,
    );
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const paidTxs = transactions.filter(t =>
      t.cardId === cardId && t.kind === 'card_payment' &&
      t.status === 'confirmed' && t.paidCardMonth === `${monthISO}-01`,
    );
    const paid = paidTxs.reduce((s, t) => s + t.amount, 0);
    const remaining = Math.max(0, total - paid);
    const today = new Date().toISOString().slice(0, 10);
    const closed = today > end;
    let status: 'open' | 'closed' | 'paid' | 'partial' = 'open';
    if (paid >= total && total > 0) status = 'paid';
    else if (paid > 0) status = 'partial';
    else if (closed) status = 'closed';
    return { start, end, due, total, paid, remaining, status, transactions: txs };
  }, [transactions, statementPeriod]);

  const getCardCategoryBreakdown = useCallback((cardId: string, monthISO: string) => {
    const cur = getCardStatement(cardId, monthISO);
    const [y, m] = monthISO.split('-').map(Number);
    const prevISO = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
    const prev = getCardStatement(cardId, prevISO);
    const curByCat = new Map<string, number>();
    let curUncat = 0;
    for (const t of cur.transactions) {
      if (t.categoryId) curByCat.set(t.categoryId, (curByCat.get(t.categoryId) || 0) + t.amount);
      else curUncat += t.amount;
    }
    const prevByCat = new Map<string, number>();
    let prevUncat = 0;
    for (const t of prev.transactions) {
      if (t.categoryId) prevByCat.set(t.categoryId, (prevByCat.get(t.categoryId) || 0) + t.amount);
      else prevUncat += t.amount;
    }
    const total = cur.total || 1;
    const rows = categories
      .filter(c => c.kind === 'expense' && !c.archived && (curByCat.get(c.id) || 0) > 0)
      .map(c => {
        const t = curByCat.get(c.id) || 0;
        const p = prevByCat.get(c.id) || 0;
        return {
          categoryId: c.id as string | null,
          name: c.name, color: c.color, total: t,
          pct: (t / total) * 100,
          deltaPct: p > 0 ? ((t - p) / p) * 100 : null,
        };
      });
    if (curUncat > 0) {
      rows.push({
        categoryId: null, name: 'Sem categoria', color: '#94a3b8', total: curUncat,
        pct: (curUncat / total) * 100,
        deltaPct: prevUncat > 0 ? ((curUncat - prevUncat) / prevUncat) * 100 : null,
      });
    }
    return rows.sort((a, b) => b.total - a.total);
  }, [getCardStatement, categories]);

  const getCardActiveInstallments = useCallback((cardId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const groups = new Map<string, FinTransaction[]>();
    for (const t of transactions) {
      if (t.cardId !== cardId) continue;
      if (!t.purchaseGroupId || !t.installmentTotal) continue;
      const arr = groups.get(t.purchaseGroupId) || [];
      arr.push(t);
      groups.set(t.purchaseGroupId, arr);
    }
    const out: Array<{
      purchaseGroupId: string; description: string; installmentAmount: number;
      total: number; paidCount: number; remaining: number; endsNextMonth: boolean;
      nextDueOn: string | null;
    }> = [];
    for (const [gid, arr] of groups) {
      arr.sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
      const first = arr[0];
      const total = first.installmentTotal!;
      const paidCount = arr.filter(t => t.occurredOn < today && t.status === 'confirmed').length;
      const remaining = total - paidCount;
      if (remaining <= 0) continue;
      const nextTx = arr.find(t => t.occurredOn >= today) || arr[arr.length - 1];
      out.push({
        purchaseGroupId: gid,
        description: first.description.replace(/\s*\(\d+\/\d+\)\s*$/, ''),
        installmentAmount: first.amount,
        total, paidCount, remaining,
        endsNextMonth: remaining <= 2,
        nextDueOn: nextTx.occurredOn,
      });
    }
    return out.sort((a, b) => a.remaining - b.remaining);
  }, [transactions]);

  const getCardPaymentsForMonth = useCallback((monthISO: string) => {
    const { start, end } = monthBounds(monthISO);
    return transactions
      .filter(t => t.kind === 'card_payment' && t.status === 'confirmed'
        && t.occurredOn >= start && t.occurredOn <= end)
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, monthBounds]);

  // ---------- Card actions ----------
  const addInstallmentPurchase: FinanceContextType['addInstallmentPurchase'] = async (data) => {
    const userId = await getUserId(); if (!userId) return;
    const n = Math.max(1, Math.floor(data.installments));
    const per = Math.round((data.totalAmount / n) * 100) / 100;
    const remainder = Math.round((data.totalAmount - per * (n - 1)) * 100) / 100;
    const groupId = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const [fy, fm, fd] = data.firstOccurredOn.split('-').map(Number);
    const rows = Array.from({ length: n }, (_, i) => {
      const d = new Date(fy, fm - 1 + i, fd);
      const amt = i === n - 1 ? remainder : per;
      return {
        scope: data.scope, company_id: data.companyId || null,
        card_id: data.cardId, category_id: data.categoryId || null,
        kind: 'expense', amount: amt,
        description: n > 1 ? `${data.description} (${i + 1}/${n})` : data.description,
        occurred_on: ymd(d), status: data.status || 'confirmed',
        source: 'manual', notes: data.notes || null, user_id: userId,
        installment_no: i + 1, installment_total: n, purchase_group_id: groupId,
      };
    });
    await supabase.from('fin_transactions').insert(rows as any);
  };

  const addCardPayment: FinanceContextType['addCardPayment'] = async (data) => {
    const userId = await getUserId(); if (!userId) return;
    await supabase.from('fin_transactions').insert({
      scope: data.scope, company_id: data.companyId || null,
      card_id: data.cardId, account_id: data.accountId,
      kind: 'card_payment', amount: data.amount,
      description: data.description || `Pagamento fatura ${data.paidCardMonth.slice(0, 7)}`,
      occurred_on: data.occurredOn, status: 'confirmed',
      source: 'manual', paid_card_month: data.paidCardMonth,
      user_id: userId,
    } as any);
  };

  const convertToCardPayment: FinanceContextType['convertToCardPayment'] = async (transactionId, cardId, paidCardMonth) => {
    await supabase.from('fin_transactions').update({
      kind: 'card_payment', card_id: cardId, paid_card_month: paidCardMonth,
    } as any).eq('id', transactionId);
  };

  const value = useMemo<FinanceContextType>(() => ({
    loading, companies, accounts, cards, categories, people, recurrences, transactions,
    scope, setScope, selectedCompanyId, setSelectedCompanyId,
    addCompany, updateCompany, deleteCompany,
    addAccount, updateAccount, deleteAccount,
    addCard, updateCard, deleteCard, setCardStatementOverride,
    addCategory, updateCategory, deleteCategory,
    addPerson, updatePerson, deletePerson,
    addTransaction, updateTransaction, deleteTransaction, deleteTransactionAndFuture,
    addRecurrence, updateRecurrence, deleteRecurrence,
    addTransferBetweenAccounts, addInterCompanyTransfer,
    addInstallmentPurchase, addCardPayment, convertToCardPayment,
    accountBalance, cardOpenInvoice,
    getMonthTotals, getUpcomingBills, getCategoryTotals, getYearMatrix,
    getCardStatement, getCardCategoryBreakdown, getCardActiveInstallments, getCardPaymentsForMonth,
  }), [loading, companies, accounts, cards, categories, people, recurrences, transactions,
       scope, setScope, selectedCompanyId, setSelectedCompanyId,
       accountBalance, cardOpenInvoice,
       getMonthTotals, getUpcomingBills, getCategoryTotals, getYearMatrix,
       getCardStatement, getCardCategoryBreakdown, getCardActiveInstallments, getCardPaymentsForMonth]);


  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
