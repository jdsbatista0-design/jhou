// Edge function: gcal-sync
// Actions:
//   init  -> garante a agenda "Central" no Google e salva calendar_id
//   push  -> envia 1 item (criado/atualizado/deletado) para o Google
//   pull  -> baixa mudanças incrementais do Google para items locais
//
// Auth: requer JWT do usuário logado (verify_jwt = true via config padrão).
// Conexão Google Calendar via Lovable Connector Gateway (sem OAuth manual).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const CALENDAR_NAME = "Central";
const CALENDAR_TIMEZONE = "America/Sao_Paulo";

function gheaders() {
  const lov = Deno.env.get("LOVABLE_API_KEY");
  const gcal = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
  if (!lov) throw new Error("LOVABLE_API_KEY não configurado");
  if (!gcal) throw new Error("GOOGLE_CALENDAR_API_KEY não configurado (conecte o Google Calendar em Connectors)");
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": gcal,
    "Content-Type": "application/json",
  };
}

async function gfetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...gheaders(), ...(init.headers || {}) },
  });
}

// ------- helpers -------
function buildEventBody(item: any) {
  // item: { id, title, description, deadline (YYYY-MM-DD), deadline_time (HH:mm) | null, area, fase, tipo, person }
  const date: string = item.deadline; // YYYY-MM-DD
  const time: string | null = item.deadline_time;
  const summary = item.title;
  const descParts = [
    item.description ? item.description : null,
    item.area ? `Área: ${item.area}` : null,
    item.fase ? `Fase: ${item.fase}` : null,
    item.person ? `Pessoa: ${item.person}` : null,
    `— Central (item ${item.id})`,
  ].filter(Boolean);
  const description = descParts.join("\n");

  if (time) {
    const start = `${date}T${time}:00`;
    // Duração default 1h
    const [hh, mm] = time.split(":").map(Number);
    const endH = String((hh + 1) % 24).padStart(2, "0");
    const end = `${date}T${endH}:${String(mm).padStart(2, "0")}:00`;
    return {
      summary,
      description,
      start: { dateTime: start, timeZone: CALENDAR_TIMEZONE },
      end: { dateTime: end, timeZone: CALENDAR_TIMEZONE },
      extendedProperties: { private: { centralItemId: item.id } },
    };
  }
  // all-day
  // Google API: end.date é exclusivo, soma 1 dia
  const next = new Date(date + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  const endDate = next.toISOString().slice(0, 10);
  return {
    summary,
    description,
    start: { date },
    end: { date: endDate },
    extendedProperties: { private: { centralItemId: item.id } },
  };
}

async function ensureCalendar(supa: any, userId: string): Promise<string> {
  const { data: state } = await supa
    .from("gcal_state")
    .select("calendar_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (state?.calendar_id) return state.calendar_id;

  // 1) Procurar agenda existente "Central" na lista
  const listRes = await gfetch("/users/me/calendarList?maxResults=250");
  if (!listRes.ok) {
    const t = await listRes.text();
    throw new Error(`calendarList falhou [${listRes.status}]: ${t}`);
  }
  const list = await listRes.json();
  let calendarId: string | undefined = (list.items || []).find(
    (c: any) => c.summary === CALENDAR_NAME,
  )?.id;

  // 2) Criar se não existir
  if (!calendarId) {
    const createRes = await gfetch("/calendars", {
      method: "POST",
      body: JSON.stringify({
        summary: CALENDAR_NAME,
        timeZone: CALENDAR_TIMEZONE,
        description: "Sincronizado pelo Central",
      }),
    });
    if (!createRes.ok) {
      const t = await createRes.text();
      throw new Error(`Criação da agenda falhou [${createRes.status}]: ${t}`);
    }
    const created = await createRes.json();
    calendarId = created.id;
  }

  await supa
    .from("gcal_state")
    .upsert(
      { user_id: userId, calendar_id: calendarId },
      { onConflict: "user_id" },
    );
  return calendarId!;
}

async function pushItem(
  supa: any,
  userId: string,
  itemId: string,
  action: "upsert" | "delete",
) {
  const calendarId = await ensureCalendar(supa, userId);

  // mapping atual
  const { data: mapping } = await supa
    .from("gcal_sync")
    .select("*")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();

  if (action === "delete") {
    if (mapping?.google_event_id) {
      const r = await gfetch(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(mapping.google_event_id)}`,
        { method: "DELETE" },
      );
      // 410 = já deletado, ok
      if (!r.ok && r.status !== 410 && r.status !== 404) {
        const t = await r.text();
        throw new Error(`Delete event falhou [${r.status}]: ${t}`);
      }
      await supa
        .from("gcal_sync")
        .update({ deleted: true })
        .eq("id", mapping.id);
    }
    return { ok: true, deleted: true };
  }

  // upsert: precisa do item
  const { data: item, error: itemErr } = await supa
    .from("items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!item) return { ok: true, skipped: "item não encontrado" };

  // Sem deadline ou concluído -> deletar do Google se existia
  if (!item.deadline || item.fase === "Concluído") {
    if (mapping?.google_event_id) {
      const r = await gfetch(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(mapping.google_event_id)}`,
        { method: "DELETE" },
      );
      if (!r.ok && r.status !== 410 && r.status !== 404) {
        const t = await r.text();
        throw new Error(`Delete event falhou [${r.status}]: ${t}`);
      }
      await supa.from("gcal_sync").update({ deleted: true }).eq("id", mapping.id);
    }
    return { ok: true, removed_from_calendar: true };
  }

  const body = buildEventBody(item);

  if (mapping?.google_event_id && !mapping.deleted) {
    // PATCH
    const r = await gfetch(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(mapping.google_event_id)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    if (r.status === 404 || r.status === 410) {
      // recriar
      const r2 = await gfetch(
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: "POST", body: JSON.stringify(body) },
      );
      if (!r2.ok) throw new Error(`Recriar event falhou [${r2.status}]: ${await r2.text()}`);
      const ev = await r2.json();
      await supa
        .from("gcal_sync")
        .update({
          google_event_id: ev.id,
          google_calendar_id: calendarId,
          deleted: false,
          last_local_updated_at: item.updated_at,
          last_remote_updated_at: ev.updated,
        })
        .eq("id", mapping.id);
      return { ok: true, recreated: true, eventId: ev.id };
    }
    if (!r.ok) throw new Error(`Patch event falhou [${r.status}]: ${await r.text()}`);
    const ev = await r.json();
    await supa
      .from("gcal_sync")
      .update({
        last_local_updated_at: item.updated_at,
        last_remote_updated_at: ev.updated,
      })
      .eq("id", mapping.id);
    return { ok: true, updated: true, eventId: ev.id };
  }

  // INSERT novo
  const r = await gfetch(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!r.ok) throw new Error(`Insert event falhou [${r.status}]: ${await r.text()}`);
  const ev = await r.json();
  await supa.from("gcal_sync").upsert(
    {
      user_id: userId,
      item_id: itemId,
      google_event_id: ev.id,
      google_calendar_id: calendarId,
      deleted: false,
      last_local_updated_at: item.updated_at,
      last_remote_updated_at: ev.updated,
    },
    { onConflict: "user_id,google_event_id" },
  );
  await supa
    .from("gcal_state")
    .update({ last_push_at: new Date().toISOString() })
    .eq("user_id", userId);
  return { ok: true, inserted: true, eventId: ev.id };
}

async function pullChanges(supa: any, userId: string) {
  const calendarId = await ensureCalendar(supa, userId);
  const { data: state } = await supa
    .from("gcal_state")
    .select("sync_token")
    .eq("user_id", userId)
    .maybeSingle();

  let pageToken: string | undefined = undefined;
  let syncToken: string | undefined = state?.sync_token || undefined;
  let nextSyncToken: string | undefined;
  let processed = 0;

  // Se nunca sincronizou, faz full sync limitado aos próximos 6 meses + último mês
  const baseParams = new URLSearchParams();
  if (syncToken) baseParams.set("syncToken", syncToken);
  else {
    const past = new Date();
    past.setMonth(past.getMonth() - 1);
    const future = new Date();
    future.setMonth(future.getMonth() + 6);
    baseParams.set("timeMin", past.toISOString());
    baseParams.set("timeMax", future.toISOString());
    baseParams.set("singleEvents", "true");
  }
  baseParams.set("maxResults", "250");

  while (true) {
    const params = new URLSearchParams(baseParams);
    if (pageToken) params.set("pageToken", pageToken);

    const r = await gfetch(
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    );
    if (r.status === 410) {
      // sync token invalidado -> reset e refaz full
      await supa.from("gcal_state").update({ sync_token: null }).eq("user_id", userId);
      return { ok: true, reset: true, processed };
    }
    if (!r.ok) throw new Error(`Pull falhou [${r.status}]: ${await r.text()}`);
    const data = await r.json();

    for (const ev of data.items || []) {
      processed++;
      await applyRemoteEvent(supa, userId, calendarId, ev);
    }

    if (data.nextPageToken) {
      pageToken = data.nextPageToken;
      continue;
    }
    nextSyncToken = data.nextSyncToken;
    break;
  }

  await supa
    .from("gcal_state")
    .update({
      sync_token: nextSyncToken ?? null,
      last_pull_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return { ok: true, processed };
}

async function applyRemoteEvent(
  supa: any,
  userId: string,
  calendarId: string,
  ev: any,
) {
  // Identificar se é um evento gerado pelo Central
  const centralItemId: string | undefined =
    ev.extendedProperties?.private?.centralItemId;

  // Caso 1: evento cancelado/deletado no Google
  if (ev.status === "cancelled") {
    const { data: mapping } = await supa
      .from("gcal_sync")
      .select("*")
      .eq("user_id", userId)
      .eq("google_event_id", ev.id)
      .maybeSingle();
    if (mapping?.item_id) {
      // Soft action: marca item como Concluído (não deleta)
      await supa
        .from("items")
        .update({ fase: "Concluído", updated_at: new Date().toISOString() })
        .eq("id", mapping.item_id)
        .eq("user_id", userId);
    }
    if (mapping) {
      await supa.from("gcal_sync").update({ deleted: true }).eq("id", mapping.id);
    }
    return;
  }

  // Resolver mapping (por google_event_id ou por centralItemId)
  let { data: mapping } = await supa
    .from("gcal_sync")
    .select("*")
    .eq("user_id", userId)
    .eq("google_event_id", ev.id)
    .maybeSingle();

  if (!mapping && centralItemId) {
    const { data: byItem } = await supa
      .from("gcal_sync")
      .select("*")
      .eq("user_id", userId)
      .eq("item_id", centralItemId)
      .maybeSingle();
    if (byItem) mapping = byItem;
  }

  // Extrair data/hora do evento
  const startDateTime: string | undefined = ev.start?.dateTime;
  const startDate: string | undefined = ev.start?.date;
  let deadline: string | null = null;
  let deadlineTime: string | null = null;
  if (startDateTime) {
    // Pega a porção local (vem com timezone)
    const d = new Date(startDateTime);
    deadline = d.toISOString().slice(0, 10);
    deadlineTime =
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0");
  } else if (startDate) {
    deadline = startDate;
    deadlineTime = null;
  }

  if (!deadline) return; // ignorar eventos sem data válida

  if (mapping?.item_id) {
    // Atualizar item existente — last-write-wins por updated_at
    const { data: localItem } = await supa
      .from("items")
      .select("updated_at")
      .eq("id", mapping.item_id)
      .maybeSingle();

    const localUpd = localItem?.updated_at ? new Date(localItem.updated_at).getTime() : 0;
    const remoteUpd = ev.updated ? new Date(ev.updated).getTime() : 0;

    if (remoteUpd >= localUpd) {
      await supa
        .from("items")
        .update({
          title: ev.summary || "(sem título)",
          deadline,
          deadline_time: deadlineTime,
          updated_at: new Date(remoteUpd).toISOString(),
        })
        .eq("id", mapping.item_id);
    }
    await supa
      .from("gcal_sync")
      .update({
        google_event_id: ev.id,
        google_calendar_id: calendarId,
        deleted: false,
        last_remote_updated_at: ev.updated,
      })
      .eq("id", mapping.id);
    return;
  }

  // Criar novo item a partir do evento (criado direto no Google)
  // Buscar settings do user para área default
  const { data: settingsRow } = await supa
    .from("app_settings")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "central_settings")
    .maybeSingle();
  const defaultArea =
    (settingsRow?.value as any)?.areas?.[0] || "Pessoal";

  const { data: newItem, error: insErr } = await supa
    .from("items")
    .insert({
      title: ev.summary || "(sem título)",
      description: ev.description || null,
      tipo: "Ação",
      fase: "Inbox",
      area: defaultArea,
      deadline,
      deadline_time: deadlineTime,
      user_id: userId,
    })
    .select("id")
    .single();

  if (insErr || !newItem) return;

  await supa.from("gcal_sync").upsert(
    {
      user_id: userId,
      item_id: newItem.id,
      google_event_id: ev.id,
      google_calendar_id: calendarId,
      deleted: false,
      last_remote_updated_at: ev.updated,
    },
    { onConflict: "user_id,google_event_id" },
  );
}

// ---------- HTTP entry ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: userErr,
    } = await supa.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    let result: any;
    switch (action) {
      case "init": {
        const calendarId = await ensureCalendar(supa, user.id);
        result = { ok: true, calendarId };
        break;
      }
      case "push": {
        const { itemId, op } = body || {};
        if (!itemId || !op) throw new Error("itemId e op são obrigatórios");
        result = await pushItem(supa, user.id, itemId, op);
        break;
      }
      case "pull": {
        result = await pullChanges(supa, user.id);
        break;
      }
      case "sync": {
        // pull + push de items pendentes (sem mapping ou desatualizados)
        const pull = await pullChanges(supa, user.id);
        // Push dos items com deadline e fase != Concluído que ainda não estão sincronizados ou estão desatualizados
        const { data: items } = await supa
          .from("items")
          .select("id, updated_at, deadline, fase")
          .eq("user_id", user.id)
          .not("deadline", "is", null)
          .neq("fase", "Concluído");
        let pushed = 0;
        for (const it of items || []) {
          const { data: m } = await supa
            .from("gcal_sync")
            .select("last_local_updated_at, deleted")
            .eq("user_id", user.id)
            .eq("item_id", it.id)
            .maybeSingle();
          const needsPush =
            !m ||
            m.deleted ||
            !m.last_local_updated_at ||
            new Date(it.updated_at).getTime() >
              new Date(m.last_local_updated_at).getTime();
          if (needsPush) {
            try {
              await pushItem(supa, user.id, it.id, "upsert");
              pushed++;
            } catch (e) {
              console.error("push item falhou", it.id, e);
            }
          }
        }
        result = { ok: true, pull, pushed };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("gcal-sync error:", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
