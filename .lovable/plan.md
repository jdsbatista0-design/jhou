
# Corrigir erro RLS no botão "Sincronizar" das Configurações

## Problema

O toast **"Erro ao sincronizar"** aparece ao tocar **Sincronizar** em Configurações. A causa é uma violação de RLS na tabela `app_settings`:

- Política RLS exige `auth.uid() = user_id` (USING e WITH CHECK).
- O `upsert` em `src/pages/SettingsPage.tsx` (linhas 235–237) envia apenas `{ key, value }` — sem `user_id`.
- Resultado: o Postgres tenta inserir/atualizar uma linha com `user_id = NULL`, que falha o WITH CHECK.
- Bônus: o `upsert` não declara `onConflict`, então pode tentar inserir duplicata em vez de atualizar.

> Este bug é **independente** da integração com Google Agenda. Ela continua funcional — o erro é só no botão local de salvar/sincronizar as configurações.

## Correção

Em `src/pages/SettingsPage.tsx`, função `handleSyncNow`:

1. Buscar o usuário atual antes do upsert:
   ```ts
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error('Sessão expirada');
   ```
2. Incluir `user_id` no payload e declarar `onConflict`:
   ```ts
   const { error: upErr } = await (supabase as any)
     .from('app_settings')
     .upsert(
       { key: 'central_settings', value: settings, user_id: user.id },
       { onConflict: 'user_id,key' }
     );
   ```
3. Varrer o restante do arquivo por outros `insert`/`upsert` em `app_settings` sem `user_id` (ex.: autosave) e aplicar o mesmo padrão.

## Verificação

- Configurações → **Sincronizar** → toast de sucesso.
- Recarregar e confirmar que as configurações persistem.

## Fora de escopo

- Não alterar `gcal-sync`, `gcal_state`, `gcal_sync` nem `GoogleCalendarCard`.
- Não mexer nas políticas RLS — a política está correta; o bug é no cliente.
