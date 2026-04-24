## 🎯 Objetivo
Eliminar o PIN 0507 e usar **Login com Google** (gerenciado pelo Lovable Cloud, sem precisar criar credenciais OAuth). Login uma vez por dispositivo — depois entra direto. Preparar a base para conectar Google Agenda em um próximo ciclo.

---

## 1. Backend — Migração SQL

### 1a. Adicionar `user_id` em todas as tabelas de dados
```sql
ALTER TABLE public.items          ADD COLUMN user_id uuid;
ALTER TABLE public.inbox_entries  ADD COLUMN user_id uuid;
ALTER TABLE public.events         ADD COLUMN user_id uuid;
ALTER TABLE public.memories       ADD COLUMN user_id uuid;
ALTER TABLE public.item_comments  ADD COLUMN user_id uuid;
ALTER TABLE public.app_settings   ADD COLUMN user_id uuid;
```
> `user_id` fica **nullable temporariamente** para não quebrar dados existentes. Após o primeiro login, eu rodo um UPDATE atribuindo todos os registros ao seu usuário e então marco como NOT NULL.

### 1b. Substituir RLS abertas por RLS por dono
Para cada tabela acima, dropar a policy "Allow all access to..." e criar:
```sql
CREATE POLICY "Users access own rows" ON public.<tabela>
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 1c. Tabela `profiles` (boas práticas Lovable Cloud)
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger auto-cria profile no signup
CREATE FUNCTION public.handle_new_user() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 1d. Migração de dados (após primeiro login)
Após você fazer login pela primeira vez, rodo um `UPDATE` em todas as tabelas atribuindo os 32 itens, 26 inbox entries, eventos, memórias e settings ao seu `user_id`. Depois aplico `NOT NULL`.

---

## 2. Frontend — Login Google

### 2a. Configurar social login
- Chamo o tool **`Configure Social Auth`** para Google → gera o módulo `src/integrations/lovable/` automaticamente
- Lovable Cloud já vem com credenciais Google gerenciadas — **zero configuração externa** necessária

### 2b. Substituir `LockScreen` por tela de Login
**Deletar:** `src/components/LockScreen.tsx` (PIN)
**Criar:** `src/pages/Auth.tsx` com:
- Visual minimalista (mesma estética do app: dark, mobile-first)
- Botão "Continuar com Google"
- Logo + nome "Central"
- Mensagem: "Acesso privado — apenas seu Google autorizado"

### 2c. Refatorar `src/App.tsx`
- Remover lógica `sessionStorage.getItem('central_unlocked')`
- Usar `supabase.auth.onAuthStateChange` + `getSession()` (na ordem correta — listener antes de getSession, conforme regras de auth)
- Estado: `loading | authenticated | unauthenticated`
- Sem sessão → renderiza `<Auth />`
- Com sessão → renderiza app normal

### 2d. Botão "Sair" nas Configurações
- Adicionar em `src/pages/SettingsPage.tsx` botão **"Sair da conta"** que chama `supabase.auth.signOut()`
- Mostrar email/nome/foto do usuário logado no topo das Configurações

---

## 3. Atualizar inserts no código (passar `user_id`)

Onde quer que se faça `supabase.from('items').insert(...)` (ou outras tabelas), incluir `user_id: session.user.id`. Arquivos afetados:
- `src/contexts/CentralContext.tsx` (principal — todos os CRUDs)
- `src/pages/AgendaPage.tsx` (criação de itens via agenda)
- `src/components/QuickInput.tsx` (captura)
- `src/components/CaptureFAB.tsx`
- `src/pages/InboxPage.tsx`
- `supabase/functions/whatsapp-webhook/index.ts` — usar `service_role` e atribuir ao seu user_id (você é o único usuário do WhatsApp por enquanto; tratamos isso como configuração)

---

## 4. Google Agenda (preparação, NÃO implementado neste ciclo)
- Adicionar nas Configurações um card **"Google Agenda — Não conectado"** com botão desativado e texto "Em breve"
- No próximo ciclo: implementaremos OAuth separado com escopo `calendar` + sync bidirecional

---

## 5. Verificações pós-implementação
- Build limpa (`npm run build`)
- Testar login Google na preview
- Verificar que dados antigos aparecem (após migração de vínculo)
- Confirmar que logout funciona
- Confirmar que outro usuário (se logar) **não vê** seus dados

---

## ⚠️ Importante para você saber
- **Não dá para "desfazer" depois de logar**: assim que você logar pela primeira vez, vinculo seus dados ao seu user_id. Se mudar de conta Google depois, perde o acesso aos dados antigos (a menos que eu rode outra migração manual).
- **Backup antes**: já temos o `central_backup_20260422_191624.zip` que geramos outro dia. Se quiser, gero um novo backup atualizado antes de aplicar a migração.
- **WhatsApp webhook**: continua funcionando, mas todos os inbox entries que vierem por lá serão atribuídos ao seu user_id (você é o dono do número).