import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HABITS, habitMonths, declining, type DayRecord } from '@/lib/weekPlan';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
export default function WeekThermometer({userId,today,revision}:{userId:string;today:string;revision:number}){
 const [records,setRecords]=useState<DayRecord[]>([]),[status,setStatus]=useState('Carregando…');
 useEffect(()=>{let active=true;const start=habitMonths([],today)[0].month+'-01';supabase.from('dias').select('*').eq('user_id',userId).gte('data',start).lte('data',today).then(({data,error})=>{if(active){setStatus(error?'Não foi possível carregar':'');if(data)setRecords(data);}});return()=>{active=false;};},[userId,today,revision]);
 const months=habitMonths(records,today);
 return <div className="space-y-6"><p className="text-sm text-muted-foreground">Não é meta: é leitura.</p>{status?<p role="status">{status}</p>:HABITS.map(h=>{const counts=months.map(m=>m.counts[h.key]),max=Math.max(...counts,1);return <section key={h.key} className="border-b border-border pb-6"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">{h.label}</h2><div className="text-right"><strong className="font-display text-3xl text-primary tabular-nums">{counts[3]}</strong><span className="block text-xs text-muted-foreground">dias neste mês</span></div></div><div className="grid grid-cols-4 gap-4 mt-4">{months.map((m,i)=><div key={m.month} className="text-center text-xs"><span className="text-muted-foreground">{counts[i]}</span><div className="h-24 flex items-end justify-center mt-1"><div className={`w-full rounded-t-sm ${i===3?'bg-primary':'bg-primary/25'}`} style={{height:`${counts[i]/max*100}%`}}/></div><span className="block pt-2">{format(new Date(m.month+'-01T12:00:00'),'MMM',{locale:ptBR})}</span></div>)}</div>{declining(counts)&&<p className="text-sm text-accent mt-4">Caiu dois meses seguidos. É sinal: vale a conversa com sua esposa.</p>}</section>;})}</div>;
}
