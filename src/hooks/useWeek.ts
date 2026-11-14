import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { emptyWeek, planSchema, type Week } from '@/lib/weekPlan';
export function useWeek(userId:string, monday:string) {
 const [week,setWeek]=useState<Week>(emptyWeek(monday));
 const [status,setStatus]=useState('Carregando…');
 const [ready,setReady]=useState(false);
 const current=useRef(week), version=useRef(0), saved=useRef(0);
 const queue=useRef<Promise<unknown>>(Promise.resolve());
 const save=useCallback(async()=>{
  const task=async()=>{
   if(version.current===saved.current) return current.current;
   const snapshot=current.current, revision=version.current;
   setStatus('Salvando…');
   const {data,error}=await supabase.from('semanas').upsert({user_id:userId,semana_inicio:snapshot.semana_inicio,...planSchema.parse(snapshot),editado_em:new Date().toISOString()}, {onConflict:'user_id,semana_inicio'}).select('*').single();
   if(error){setStatus('Não salvo. Tentar novamente');throw error;}
   saved.current=revision;
   current.current={...current.current,id:data.id,editado_em:data.editado_em,sync:data.sync as Week['sync']};
   setWeek(current.current);setStatus(version.current===revision?'Salvo':'Salvando…');return current.current;
  };
  const next=queue.current.catch(()=>{}).then(task);queue.current=next;return next;
 },[userId]);
 useEffect(()=>{
  let active=true;
  setReady(false);setStatus('Carregando…');
  const load=async()=>{
   await queue.current.catch(()=>{});
   const {data,error}=await supabase.from('semanas').select('*').eq('user_id',userId).eq('semana_inicio',monday).maybeSingle();
   if(!active)return;
   if(error){setStatus('Não foi possível carregar');return;}
   const value=data?{...planSchema.parse(data),id:data.id,semana_inicio:monday,editado_em:data.editado_em,sync:data.sync as Week['sync']}:emptyWeek(monday);
   current.current=value;version.current=0;saved.current=0;setWeek(value);setStatus('Salvo');setReady(true);
  };load().catch(()=>{if(active)setStatus('Não foi possível carregar');});
  return()=>{active=false;};
 },[monday,userId]);
 const update=(change:Partial<Week>)=>{current.current={...current.current,...change};version.current++;setWeek(current.current);setStatus('Salvando…');};
 useEffect(()=>{if(!ready||version.current===saved.current)return;const timer=setTimeout(()=>{save().catch(()=>{});},500);return()=>clearTimeout(timer);},[week,ready,save]);
 useEffect(()=>()=>{if(version.current!==saved.current)save().catch(()=>{});},[save]);
 const setSync=(sync:Week['sync'])=>{current.current={...current.current,sync};setWeek(current.current);};
 return {week,update,save,status,ready,setSync};
}
