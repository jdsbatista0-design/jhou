import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useCentral } from '@/contexts/CentralContext';
import { useWeek } from '@/hooks/useWeek';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import WeekPlanner from '@/components/week/WeekPlanner';
import DayJournal from '@/components/week/DayJournal';
import WeekThermometer from '@/components/week/WeekThermometer';
import { initialWeek, saoPauloToday, shiftDate, planSchema, buildWeekEvents, workoutsForDay, type Routine } from '@/lib/weekPlan';
async function invoke(body:unknown){const {data,error}=await supabase.functions.invoke('week-calendar',{body});if(error){const details=error instanceof FunctionsHttpError?await error.context.json().catch(()=>({error:error.message})):{error:error.message};throw new Error(details.error||error.message);}return data;}
export default function MyWeekPage({userId}:{userId:string}){
 const today=saoPauloToday();
 const [monday,setMonday]=useState(()=>initialWeek(today)),[tab,setTab]=useState('plan'),[revision,setRevision]=useState(0),[connected,setConnected]=useState(false),[connectionChecked,setConnectionChecked]=useState(false),[connectionReason,setConnectionReason]=useState(''),[confirm,setConfirm]=useState(false),[syncing,setSyncing]=useState(false);
 const {week,update,save,status,ready,setSync}=useWeek(userId,monday);
 const {recurrences}=useCentral();
 const routines=useMemo(()=>recurrences as Routine[],[recurrences]);
 useEffect(()=>{let active=true;invoke({action:'status'}).then(r=>{if(active){setConnected(r.ready);setConnectionReason(r.reason||'');setConnectionChecked(true);}}).catch(e=>{if(active){setConnectionReason(e.message);setConnectionChecked(true);}});return()=>{active=false;};},[]);
 const events=buildWeekEvents(monday,week,routines);
 const overlaps=Array.from({length:7},(_,i)=>workoutsForDay(routines,shiftDate(monday,i))).flat();
 const overlapNames=[...new Set(overlaps.map(r=>r.title))];
 const navigate=async(days:number)=>{try{await save();setMonday(shiftDate(monday,days));}catch{toast.error('Salve as alterações antes de trocar a semana.');}};
 const copy=async()=>{try{const {data,error}=await supabase.from('semanas').select('*').eq('user_id',userId).eq('semana_inicio',shiftDate(monday,-7)).maybeSingle();if(error)throw error;if(!data){toast.info('A semana anterior ainda não foi planejada.');return;}update(planSchema.parse(data));toast.success('Planejamento copiado.');}catch{toast.error('Não foi possível copiar a semana.');}};
 const sync=async()=>{setSyncing(true);try{const saved=await save();if(!saved?.id||!saved.editado_em)throw new Error('Planeje a semana antes de enviar.');const result=await invoke({action:'sync',week:saved.id,expected:saved.editado_em});setSync(result.sync);setConfirm(false);toast.success(`${result.sync.count} eventos enviados para sua agenda.`);}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível enviar.');const {data}=await supabase.from('semanas').select('sync').eq('user_id',userId).eq('semana_inicio',monday).maybeSingle();if(data)setSync(data.sync as typeof week.sync);}finally{setSyncing(false);}};
 const start=new Date(monday+'T12:00:00'),end=new Date(shiftDate(monday,6)+'T12:00:00');
 const label=monday.slice(0,7)===shiftDate(monday,6).slice(0,7)?`${format(start,'d')} a ${format(end,"d 'de' MMM",{locale:ptBR})}`:`${format(start,'d MMM',{locale:ptBR})} a ${format(end,'d MMM',{locale:ptBR})}`;
 return <div className="space-y-5 pb-6"><header><p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Trabalho · Corpo · Família</p><h1 className="font-display text-3xl font-bold">Minha semana</h1></header><div role="tablist" aria-label="Minha semana" className="grid grid-cols-3 gap-1 border-b border-border pb-2">{[['plan','Planejar'],['day','Dia a dia'],['meter','Termômetro']].map(([id,label])=><Button key={id} role="tab" aria-selected={tab===id} variant={tab===id?'default':'ghost'} className="h-11 px-1" disabled={syncing} onClick={()=>setTab(id)}>{label}</Button>)}</div>
 {tab==='plan'&&<div role="tabpanel" aria-label="Planejar" className="space-y-6"><div className="flex items-center justify-between"><Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Semana anterior" disabled={!ready||syncing} onClick={()=>navigate(-7)}><ChevronLeft/></Button><div className="text-center"><h2 className="font-display text-xl font-semibold">{label}</h2><span className="text-xs text-muted-foreground">{format(start,'yyyy')}</span></div><Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Próxima semana" disabled={!ready||syncing} onClick={()=>navigate(7)}><ChevronRight/></Button></div>
 <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground" role="status">{status==='Salvo'?<Check className="h-3 w-3"/>:status==='Salvando…'?<Loader2 className="h-3 w-3 animate-spin"/>:null}{status.includes('Tentar')?<Button variant="link" onClick={()=>save().catch(()=>{})}>{status}</Button>:status}</div>
 {overlapNames.length>0&&<div className="border-l-2 border-primary pl-3 text-xs text-muted-foreground">Já em Rotinas: {overlapNames.join(' · ')}. Esses treinos ficam na origem e não serão enviados de novo.</div>}
 <WeekPlanner week={week} update={update} routines={routines} copy={copy} disabled={!ready||syncing}/>
 <section className="border-t border-border pt-5 space-y-3"><Button className="w-full h-12 whitespace-normal" disabled={!ready||syncing||!connectionChecked||events.length===0&&!(week.sync.eventIds?.length)} onClick={()=>{if(!connected){toast.info(connectionReason||'Conecte a Google Agenda em Ajustes.');return;}setConfirm(true);}}><CalendarPlus/>{week.sync.at||week.sync.eventIds?.length?'Atualizar a agenda':'Enviar a semana para a agenda'}</Button>
 {!connected&&connectionChecked&&<p className="text-xs text-muted-foreground">{connectionReason} <Link to="/ajustes" className="text-primary underline">Abrir Ajustes</Link></p>}
 {week.sync.at&&<p className="text-xs text-muted-foreground">Último envio: {format(new Date(week.sync.at),'dd/MM HH:mm',{locale:ptBR})} · {week.sync.count} eventos</p>}
 {week.sync.partial&&<p className="text-xs text-accent">O último envio foi interrompido. Atualize para concluir.</p>}
 </section></div>}
 {tab==='day'&&<DayJournal userId={userId} today={today} routines={routines} onSaved={()=>setRevision(v=>v+1)}/>}
 {tab==='meter'&&<WeekThermometer userId={userId} today={today} revision={revision}/>}
 <AlertDialog open={confirm} onOpenChange={v=>{if(!syncing)setConfirm(v);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Enviar para Google Agenda?</AlertDialogTitle><AlertDialogDescription>Vou criar {events.length} eventos na sua agenda e apagar os {week.sync.eventIds?.length||0} que esta seção criou antes para esta semana. Os outros eventos da sua agenda não mudam.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={syncing}>Cancelar</AlertDialogCancel><Button disabled={syncing} onClick={sync}>{syncing?<><Loader2 className="animate-spin"/>Enviando…</>:'Confirmar envio'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div>;
}
