// Finance module — Phase 1 types

export type FinScope = 'pf' | 'pj';
export type AccountType = 'corrente' | 'poupanca' | 'investimento' | 'dinheiro' | 'outro';
export type CategoryKind = 'income' | 'expense' | 'transfer';
export type PersonRole = 'employee' | 'supplier' | 'client' | 'other';
export type RecurrenceFreq = 'weekly' | 'monthly' | 'yearly';
export type TxStatus = 'pending' | 'confirmed' | 'cancelled';
export type TxSource = 'manual' | 'recurrence' | 'sheet' | 'bank';
export type TxKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'card_payment'
  | 'invoice_payment'
  | 'employee_payment'
  | 'supplier_payment'
  | 'employee_loan'
  | 'bank_loan'
  | 'tax'
  | 'receivable'
  | 'inter_company';

export interface FinCompany {
  id: string;
  name: string;
  cnpj?: string;
  color: string;
  archived: boolean;
  createdAt: string;
}

export interface FinAccount {
  id: string;
  scope: FinScope;
  companyId?: string;
  name: string;
  bank?: string;
  type: AccountType;
  initialBalance: number;
  color: string;
  archived: boolean;
  createdAt: string;
}

export interface FinCard {
  id: string;
  scope: FinScope;
  companyId?: string;
  accountId?: string;
  name: string;
  brand?: string;
  limitAmount: number;
  closingDay?: number;
  dueDay?: number;
  color: string;
  archived: boolean;
  createdAt: string;
}

export interface FinCategory {
  id: string;
  scope: FinScope;
  name: string;
  kind: CategoryKind;
  color: string;
  icon?: string;
  archived: boolean;
  monthlyBudget?: number; // meta mensal de gastos (null = sem meta)
}

export interface FinPerson {
  id: string;
  companyId?: string;
  name: string;
  role: PersonRole;
  document?: string;
  note?: string;
  archived: boolean;
}

export interface FinRecurrence {
  id: string;
  scope: FinScope;
  companyId?: string;
  accountId?: string;
  cardId?: string;
  categoryId?: string;
  description: string;
  amount: number;
  kind: 'income' | 'expense';
  frequency: RecurrenceFreq;
  dayOfMonth?: number;
  startOn: string;
  endOn?: string;
  active: boolean;
  lastGeneratedOn?: string;
}

export interface FinTransaction {
  id: string;
  scope: FinScope;
  companyId?: string;
  accountId?: string;
  cardId?: string;
  categoryId?: string;
  personId?: string;
  recurrenceId?: string;
  transferId?: string;
  kind: TxKind;
  amount: number;
  description: string;
  occurredOn: string; // YYYY-MM-DD
  status: TxStatus;
  attachmentUrl?: string;
  notes?: string;
  source: TxSource;
  createdAt: string;
}

// ---- Default seed categories shown the first time the user opens Finanças ----

export const DEFAULT_PF_CATEGORIES: Array<{ name: string; kind: CategoryKind; color: string }> = [
  { name: 'Salário', kind: 'income', color: '#10b981' },
  { name: 'Renda extra', kind: 'income', color: '#22c55e' },
  { name: 'Alimentação', kind: 'expense', color: '#ef4444' },
  { name: 'Transporte', kind: 'expense', color: '#f97316' },
  { name: 'Moradia', kind: 'expense', color: '#a855f7' },
  { name: 'Saúde / Plano', kind: 'expense', color: '#ec4899' },
  { name: 'Educação / Escola', kind: 'expense', color: '#3b82f6' },
  { name: 'Lazer', kind: 'expense', color: '#06b6d4' },
  { name: 'Frota', kind: 'expense', color: '#eab308' },
  { name: 'Imóveis', kind: 'expense', color: '#8b5cf6' },
  { name: 'IPTU / IPVA', kind: 'expense', color: '#dc2626' },
  { name: 'Viagens', kind: 'expense', color: '#0ea5e9' },
  { name: 'Inesperados', kind: 'expense', color: '#64748b' },
  { name: 'Empréstimos', kind: 'expense', color: '#f43f5e' },
  { name: 'Cartão (pagamento)', kind: 'transfer', color: '#475569' },
  { name: 'Transferência', kind: 'transfer', color: '#94a3b8' },
];

export const DEFAULT_PJ_CATEGORIES: Array<{ name: string; kind: CategoryKind; color: string }> = [
  { name: 'Receita de serviço', kind: 'income', color: '#10b981' },
  { name: 'Receita de venda', kind: 'income', color: '#22c55e' },
  { name: 'Folha de pagamento', kind: 'expense', color: '#ef4444' },
  { name: 'Fornecedores', kind: 'expense', color: '#f97316' },
  { name: 'Impostos', kind: 'expense', color: '#dc2626' },
  { name: 'Aluguel / Estrutura', kind: 'expense', color: '#a855f7' },
  { name: 'Marketing', kind: 'expense', color: '#ec4899' },
  { name: 'Frota', kind: 'expense', color: '#eab308' },
  { name: 'Empréstimo bancário', kind: 'expense', color: '#f43f5e' },
  { name: 'Empréstimo a funcionário', kind: 'expense', color: '#fb7185' },
  { name: 'Transferência entre empresas', kind: 'transfer', color: '#475569' },
  { name: 'Pagamento de fatura', kind: 'transfer', color: '#94a3b8' },
];

export const TX_KIND_LABELS: Record<TxKind, string> = {
  income: 'Entrada',
  expense: 'Saída',
  transfer: 'Transferência entre contas',
  card_payment: 'Pagamento de cartão',
  invoice_payment: 'Pagamento de fatura',
  employee_payment: 'Pagamento a funcionário',
  supplier_payment: 'Pagamento a fornecedor',
  employee_loan: 'Empréstimo a funcionário',
  bank_loan: 'Empréstimo bancário',
  tax: 'Imposto',
  receivable: 'Conta a receber',
  inter_company: 'Transferência entre empresas',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  investimento: 'Investimento',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
