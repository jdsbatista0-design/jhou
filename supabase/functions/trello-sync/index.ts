import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TRELLO_KEY = Deno.env.get('TRELLO_API_KEY')!;
const TRELLO_TOKEN = Deno.env.get('TRELLO_TOKEN')!;
const BOARD_NAME = 'Central — Inbox';
const FALLBACK_LIST = 'Sem área';
const DONE_FASE = 'Concluído';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function trello(path: string, init: RequestInit = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://api.trello.com/1${path}${sep}key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`Trello ${res.status}: ${text.slice(0, 300)}`);
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

const q = (v: string) => encodeURIComponent(v);
const areaOf = (item: Record<string, any>) => (item.area && String(item.area).trim()) || FALLBACK_LIST;

function itemDesc(item: Record<string, any>) {
  const parts: string[] = [];
  if (item.description) parts.push(item.description);
  const meta: string[] = [];
  if (item.tipo) meta.push(`Tipo: ${item.tipo}`);
  if (item.fase) meta.push(`Fase: ${item.fase}`);
  if (item.priority) meta.push(`Prioridade: ${item.priority}`);
  if (item.person) meta.push(`Pessoa: ${item.person}`);
  if (meta.length) parts.push('---\n' + meta.join(' · '));
  parts.push(`\n<!-- central:${item.id} -->`);
  return parts.join('\n\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!TRELLO_KEY || !TRELLO_TOKEN) return json({ error: 'Credenciais do Trello não configuradas' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: 'Não autenticado' }, 401);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = String(body.action ?? 'sync');
    if (!['connect', 'sync', 'disconnect', 'status'].includes(action)) {
      return json({ error: 'Ação inválida' }, 400);
    }

    // ---------- config ----------
    const { data: cfgRow } = await supabase
      .from('trello_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (action === 'status') {
      return json({ connected: !!cfgRow, config: cfgRow ?? null });
    }

    if (action === 'disconnect') {
      await supabase.from('trello_config').delete().eq('user_id', user.id);
      return json({ ok: true });
    }

    let config = cfgRow as any;

    if (action === 'connect' || !config) {
      const boards = await trello('/members/me/boards?fields=name,shortUrl,closed');
      let board = (boards ?? []).find((b: any) => b.name === BOARD_NAME && !b.closed);
      if (!board) {
        board = await trello(`/boards/?name=${q(BOARD_NAME)}&defaultLists=false`, { method: 'POST' });
      }
      const existing = await trello(`/boards/${board.id}/lists?fields=name`);
      const lists: Record<string, string> = {};
      for (const l of existing ?? []) lists[l.name] = l.id;

      const { data: saved, error: cfgErr } = await supabase
        .from('trello_config')
        .upsert({
          user_id: user.id,
          board_id: board.id,
          board_url: board.shortUrl ?? null,
          lists,
          enabled: true,
        }, { onConflict: 'user_id' })
        .select()
        .single();
      if (cfgErr) throw cfgErr;
      config = saved;
      if (action === 'connect') {
        return json({ ok: true, config, created: 0, updated: 0 });
      }
    }

    // ---------- sync ----------
    const lists: Record<string, string> = { ...(config.lists ?? {}) };
    let listsDirty = false;

    const ensureList = async (name: string) => {
      if (lists[name]) return lists[name];
      const created = await trello(`/lists?name=${q(name)}&idBoard=${config.board_id}`, { method: 'POST' });
      lists[name] = created.id;
      listsDirty = true;
      return created.id;
    };

    const [{ data: items }, { data: maps }, cards, boardLists] = await Promise.all([
      supabase
        .from('items')
        .select('id,title,description,tipo,fase,area,priority,person,deadline,updated_at,recurrence_id,kind')
        .eq('user_id', user.id),
      supabase.from('trello_sync').select('*').eq('user_id', user.id),
      trello(`/boards/${config.board_id}/cards?fields=name,desc,idList,dateLastActivity,closed,shortUrl&filter=all`),
      trello(`/boards/${config.board_id}/lists?fields=name`),
    ]);

    // sincroniza mapa de listas com o board real (nomes = áreas)
    for (const l of boardLists ?? []) lists[l.name] = l.id;
    const listNameById: Record<string, string> = {};
    for (const [name, id] of Object.entries(lists)) listNameById[id as string] = name;

    const byItem = new Map<string, any>();
    const byCard = new Map<string, any>();
    for (const m of maps ?? []) {
      if (m.item_id) byItem.set(m.item_id, m);
      byCard.set(m.card_id, m);
    }

    const syncable = (items ?? []).filter((i: any) => !i.recurrence_id);
    const itemById = new Map(syncable.map((i: any) => [i.id, i]));

    // garante uma lista por área usada
    const areas = [...new Set(syncable.map(areaOf))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    for (const a of areas) await ensureList(a);
    for (const [name, id] of Object.entries(lists)) listNameById[id as string] = name;

    let pushed = 0, pulled = 0, createdLocal = 0, createdRemote = 0;
    const upserts: any[] = [];

    // ---- PULL: Trello -> Central ----
    for (const card of cards ?? []) {
      const map = byCard.get(card.id);
      const listName = listNameById[card.idList] ?? FALLBACK_LIST;

      if (!map) {
        if (card.closed) continue;
        const { data: newItem, error } = await supabase
          .from('items')
          .insert({
            user_id: user.id,
            title: card.name || 'Sem título',
            description: (card.desc || '').replace(/<!--\s*central:[^>]*-->/g, '').trim() || null,
            tipo: 'Tarefa',
            fase: 'Inbox',
            area: listName === FALLBACK_LIST ? 'Pessoal' : listName,
            origin: 'inbox',
            tags: [],
            linked_agenda_ids: [],
          })
          .select('id,updated_at')
          .single();
        if (error) continue;
        upserts.push({
          user_id: user.id,
          item_id: newItem.id,
          card_id: card.id,
          list_id: card.idList,
          card_short_url: card.shortUrl,
          last_local_updated_at: newItem.updated_at,
          last_remote_updated_at: card.dateLastActivity,
        });
        createdLocal++;
        continue;
      }

      const item = map.item_id ? itemById.get(map.item_id) : null;
      if (!item) {
        if (!card.closed) await trello(`/cards/${card.id}?closed=true`, { method: 'PUT' });
        await supabase.from('trello_sync').update({ deleted: true }).eq('id', map.id);
        continue;
      }

      const remoteChanged = !map.last_remote_updated_at ||
        new Date(card.dateLastActivity) > new Date(map.last_remote_updated_at);
      const localChanged = !map.last_local_updated_at ||
        new Date(item.updated_at) > new Date(map.last_local_updated_at);

      // last-write-wins
      if (remoteChanged && (!localChanged || new Date(card.dateLastActivity) >= new Date(item.updated_at))) {
        const patch: Record<string, any> = {};
        if (card.name && card.name !== item.title) patch.title = card.name;
        const cleanDesc = (card.desc || '').replace(/<!--\s*central:[^>]*-->/g, '').split('\n---\n')[0].trim();
        if (cleanDesc && cleanDesc !== (item.description ?? '')) patch.description = cleanDesc;
        // lista = área
        if (listName !== FALLBACK_LIST && listName !== item.area) patch.area = listName;
        // arquivado no Trello = concluído
        if (card.closed && item.fase !== DONE_FASE) { patch.previous_fase = item.fase; patch.fase = DONE_FASE; }
        if (Object.keys(patch).length) {
          const { data: updated } = await supabase
            .from('items').update(patch).eq('id', item.id).eq('user_id', user.id)
            .select('updated_at').single();
          pulled++;
          upserts.push({
            user_id: user.id, item_id: item.id, card_id: card.id, list_id: card.idList,
            card_short_url: card.shortUrl,
            last_local_updated_at: updated?.updated_at ?? item.updated_at,
            last_remote_updated_at: card.dateLastActivity,
          });
          continue;
        }
      }

      // ---- PUSH direção contrária ----
      if (localChanged) {
        const targetList = await ensureList(areaOf(item));
        const shouldArchive = item.fase === DONE_FASE;
        const params = new URLSearchParams({
          name: item.title,
          desc: itemDesc(item),
          idList: targetList,
          closed: String(shouldArchive),
        });
        if (item.deadline) params.set('due', new Date(item.deadline).toISOString());
        const updatedCard = await trello(`/cards/${card.id}?${params.toString()}`, { method: 'PUT' });
        pushed++;
        upserts.push({
          user_id: user.id, item_id: item.id, card_id: card.id, list_id: targetList,
          card_short_url: updatedCard?.shortUrl ?? map.card_short_url,
          last_local_updated_at: item.updated_at,
          last_remote_updated_at: updatedCard?.dateLastActivity ?? new Date().toISOString(),
        });
      } else {
        upserts.push({
          user_id: user.id, item_id: item.id, card_id: card.id, list_id: card.idList,
          card_short_url: card.shortUrl,
          last_local_updated_at: map.last_local_updated_at,
          last_remote_updated_at: card.dateLastActivity,
        });
      }
    }

    // ---- PUSH: itens sem card (em lotes paralelos) ----
    const missing = syncable.filter((i: any) => !byItem.has(i.id));
    for (const item of missing) await ensureList(areaOf(item));

    const CHUNK = 8;
    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      const results = await Promise.all(chunk.map(async (item: any) => {
        const targetList = lists[areaOf(item)];
        const params = new URLSearchParams({
          name: item.title,
          desc: itemDesc(item),
          idList: targetList,
        });
        if (item.deadline) params.set('due', new Date(item.deadline).toISOString());
        try {
          const card = await trello(`/cards?${params.toString()}`, { method: 'POST' });
          if (item.fase === DONE_FASE) await trello(`/cards/${card.id}?closed=true`, { method: 'PUT' });
          return {
            user_id: user.id, item_id: item.id, card_id: card.id, list_id: targetList,
            card_short_url: card.shortUrl,
            last_local_updated_at: item.updated_at,
            last_remote_updated_at: card.dateLastActivity ?? new Date().toISOString(),
          };
        } catch (err) {
          console.error('falha ao criar card', item.id, (err as Error).message);
          return null;
        }
      }));
      for (const r of results) if (r) { upserts.push(r); createdRemote++; }
    }


    if (upserts.length) {
      const dedup = new Map(upserts.map((u) => [u.card_id, u]));
      const { error } = await supabase
        .from('trello_sync')
        .upsert([...dedup.values()], { onConflict: 'user_id,card_id' });
      if (error) throw error;
    }

    await supabase.from('trello_config')
      .update({ last_sync_at: new Date().toISOString(), ...(listsDirty ? { lists } : {}) })
      .eq('user_id', user.id);

    return json({
      ok: true,
      board_url: config.board_url,
      lists: Object.keys(lists).length,
      created_in_trello: createdRemote,
      created_in_central: createdLocal,
      pushed,
      pulled,
    });
  } catch (e) {
    console.error('trello-sync error', e);
    return json({ error: (e as Error).message ?? 'Erro desconhecido' }, 500);
  }
});
