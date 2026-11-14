import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'zod';
import { mondaySchema, planSchema, buildWeekEvents } from '../_shared/weekPlan.ts';
const base = 'https://connector-gateway.lovable.dev/google_calendar/calendar/v3';
const bodySchema = z.discriminatedUnion('action', [z.object({action:z.literal('status')}),z.object({action:z.literal('sync'),week:z.string().uuid(),expected:z.string().datetime({offset:true})})]);
const reply = (data: unknown, status=200) => new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async req => {
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST') return reply({error:'Método não permitido'},405);
 let admin: ReturnType<typeof createClient> | undefined;
 let lockedId: string | undefined;
 let lock: string | undefined;
 try {
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!service) return reply({error:'Serviço indisponível'},503);
  const authorization=req.headers.get('Authorization');
  if(!authorization) return reply({error:'Faça login para continuar'},401);
  const client=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user) return reply({error:'Sessão inválida'},401);
  const parsed=bodySchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return reply({error:'Pedido inválido',details:parsed.error.flatten()},400);
  const lov=Deno.env.get('LOVABLE_API_KEY'),key=Deno.env.get('GOOGLE_CALENDAR_API_KEY');
  const {data:state,error:stateError}=await client.from('gcal_state').select('calendar_id').eq('user_id',user.id).maybeSingle();
  if(stateError) throw stateError;
  const calendarId=state?.calendar_id;
  const ready=Boolean(lov&&key&&calendarId);
  if(parsed.data.action==='status') return reply({ready,reason:ready?null:'Conecte a Google Agenda em Ajustes antes de enviar sua semana.'});
  if(!ready||!calendarId||!lov||!key) return reply({error:'Conecte a Google Agenda em Ajustes antes de enviar sua semana.'},409);
  const {data:week,error:readError}=await client.from('semanas').select('*').eq('id',parsed.data.week).eq('user_id',user.id).single();
  if(readError||!week) return reply({error:'Semana não encontrada'},404);
  const plan=planSchema.safeParse(week); const monday=mondaySchema.safeParse(week.semana_inicio);
  if(!plan.success||!monday.success) return reply({error:'Revise os horários e as frentes da semana'},400);
  const {data:routines,error:routineError}=await client.from('recurrences').select('id,title,weekdays,time,start_date,end_date,active').eq('user_id',user.id);
  if(routineError) throw routineError;
  const events=buildWeekEvents(monday.data,plan.data,(routines||[]).map(r=>({id:r.id,title:r.title,weekdays:r.weekdays as number[],time:r.time,startDate:r.start_date,endDate:r.end_date||undefined,active:r.active})));
  admin=createClient(url,service);
  lock=crypto.randomUUID();
  const previous=week.sync||{};
  if(previous.busy) return reply({error:'Já existe um envio em andamento. Aguarde.'},409);
  const {data:claimed,error:claimError}=await admin.from('semanas').update({sync:{...previous,busy:lock}}).eq('id',week.id).eq('user_id',user.id).eq('editado_em',parsed.data.expected).eq('sync',JSON.stringify(previous)).select('id').maybeSingle();
  if(claimError) throw claimError;
  if(!claimed) return reply({error:'A semana mudou. Recarregue antes de enviar.'},409);
  lockedId=week.id;
  const endpoint=`/calendars/${encodeURIComponent(previous.calendarId||calendarId)}/events`;
  const gateway=async(path:string,method:string,body?:unknown) => {
   const res=await fetch(base+path,{method,headers:{Authorization:`Bearer ${lov}`,'X-Connection-Api-Key':key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
   if(method==='DELETE'&&(res.status===404||res.status===410)) return null;
   if(!res.ok) {const details=await res.text();console.error(`Google [${res.status}]: ${details}`);throw new Error(`Google [${res.status}]: ${details}`);}
   return res.status===204?null:await res.json();
  };
  let sync={...previous,busy:lock,partial:true,eventIds:[...(previous.eventIds||[])],count:previous.eventIds?.length||0};
  const persist=async()=>{const {error}=await admin?.from('semanas').update({sync}).eq('id',week.id).eq('user_id',user.id);if(error) throw error;};
  // Persist every delete/create so a failed request never loses ownership of created events.
  for(const id of [...sync.eventIds]) {await gateway(`${endpoint}/${encodeURIComponent(id)}`,'DELETE');sync.eventIds=sync.eventIds.filter((v:string)=>v!==id);sync.count=sync.eventIds.length;await persist();}
  sync.calendarId=calendarId;
  await persist();
  for(let i=0;i<events.length;i++) {
   // Stable Google-compatible IDs make retries recoverable, even if the connection drops after creation.
   const id=week.id.replaceAll('-','')+lock.replaceAll('-','')+i.toString(16).padStart(2,'0');
   sync.eventIds.push(id);sync.count=sync.eventIds.length;await persist();
   await gateway(`/calendars/${encodeURIComponent(calendarId)}/events`,'POST',{...events[i],id});
  }
  sync={...sync,at:new Date().toISOString(),busy:undefined,partial:false};await persist();lockedId=undefined;
  return reply({ok:true,sync});
 } catch(e) {
  if(admin&&lockedId&&lock) {
   const {data}=await admin.from('semanas').select('sync').eq('id',lockedId).single();
   if(data?.sync?.busy===lock) await admin.from('semanas').update({sync:{...data.sync,busy:undefined,partial:true}}).eq('id',lockedId);
  }
  const message=e instanceof Error?e.message:String(e);
  return reply({error:message},502);
 }
});
