import { useQuery } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AgendaEntry } from '@/contexts/CentralContext';
export function useGoogleAgenda(month:string) {
 return useQuery({queryKey:['google-agenda',month],staleTime:60_000,refetchInterval:300_000,refetchOnWindowFocus:true,
  queryFn:async()=>{
   const {data,error}=await supabase.functions.invoke('gcal-sync',{body:{action:'agenda',month}});
   if(error)throw new Error(error instanceof FunctionsHttpError ? await error.context.text() : error.message);
   if(data?.error)throw new Error(data.error);
   return data as {entries:AgendaEntry[];localItemIds:string[];warnings:string[]};
  }
 });
}