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
});
const rowCategory = (r: any): FinCategory => ({
  id: r.id, scope: r.scope, name: r.name, kind: r.kind, color: r.color,
  icon: r.icon || undefined, archived: r.archived,
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
  // Computed helpers
  accountBalance: (accountId: string) => number;
  cardOpenInvoice: (cardId: string) => number;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<FinCompany[]>([]);
  const [accounts, setAccounts] = useState<FinAccount[]>([]);
  const [cards, setCards] = useState<FinCard[]>([]);
  const [categories, setCategories] = useState<FinCategory[]>([]);
  const [people, setPeople] = useState<FinPerson[]>([]);
  const [recurrences, setRecurrences] = useState<FinRecurrence[]>([]);
  const [transactions, setTransactions] = useState<FinTransaction[]>([]);

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

  // ---------- Refresh ----------
  const refreshAll = useCallback(async () => {
    const [c, a, cd, cat, pe, rec, tx] = await Promise.all([
      supabase.from('fin_companies').select('*').order('created_at', { ascending: true }),
      supabase.from('fin_accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('fin_cards').select('*').order('created_at', { ascending: true }),
      supabase.from('fin_categories').select('*').order('name', { ascending: true }),
      supabase.from('fin_people').select('*').order('name', { ascending: true }),
      supabase.from('fin_recurrences').select('*').order('created_at', { ascending: true }),
      supabase.from('fin_transactions').select('*').order('occurred_on', { ascending: false }).limit(2000),
    ]);
    if (c.data) setCompanies(c.data.map(rowCompany));
    if (a.data) setAccounts(a.data.map(rowAccount));
    if (cd.data) setCards(cd.data.map(rowCard));
    if (cat.data) setCategories(cat.data.map(rowCategory));
    if (pe.data) setPeople(pe.data.map(rowPerson));
    if (rec.data) setRecurrences(rec.data.map(rowRecurrence));
    if (tx.data) setTransactions(tx.data.map(rowTransaction));
    setLoading(false);
  }, []);

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
      // First occurrence to evaluate: day AFTER last_generated_on, or start_on itself
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
    for (const u of lastGenUpdates) {
      await supabase.from('fin_recurrences').update({ last_generated_on: u.date }).eq('id', u.id);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await seedDefaultCategoriesIfNeeded();
      await generatePendingRecurrences();
      await refreshAll();
    })();

    const ch = supabase
      .channel('fin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_companies' }, () => refreshAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_accounts' }, () => refreshAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_cards' }, () => refreshAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_categories' }, () => refreshAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_people' }, () => refreshAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_recurrences' }, () => refreshAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_transactions' }, () => refreshAll())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [refreshAll, seedDefaultCategoriesIfNeeded, generatePendingRecurrences]);

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

  // ---------- Categories ----------
  const addCategory: FinanceContextType['addCategory'] = async (c) => {
    const userId = await getUserId(); if (!userId) return;
    await supabase.from('fin_categories').insert({
      scope: c.scope, name: c.name, kind: c.kind, color: c.color || '#64748b',
      icon: c.icon || null, user_id: userId,
    });
  };
  const updateCategory: FinanceContextType['updateCategory'] = async (id, data) => {
    await supabase.from('fin_categories').update({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.kind !== undefined ? { kind: data.kind } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.icon !== undefined ? { icon: data.icon || null } : {}),
      ...(data.archived !== undefined ? { archived: data.archived } : {}),
    }).eq('id', id);
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
    });
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

  const value = useMemo<FinanceContextType>(() => ({
    loading, companies, accounts, cards, categories, people, recurrences, transactions,
    scope, setScope, selectedCompanyId, setSelectedCompanyId,
    addCompany, updateCompany, deleteCompany,
    addAccount, updateAccount, deleteAccount,
    addCard, updateCard, deleteCard,
    addCategory, updateCategory, deleteCategory,
    addPerson, updatePerson, deletePerson,
    addTransaction, updateTransaction, deleteTransaction,
    addTransferBetweenAccounts, addInterCompanyTransfer,
    accountBalance, cardOpenInvoice,
  }), [loading, companies, accounts, cards, categories, people, recurrences, transactions,
       scope, setScope, selectedCompanyId, setSelectedCompanyId,
       accountBalance, cardOpenInvoice]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
