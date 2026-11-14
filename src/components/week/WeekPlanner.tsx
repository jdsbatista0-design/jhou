import { Eraser, Copy, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useState } from 'react';
import { FRONTS, DAY_NAMES, HOLIDAYS, TRAININGS, shiftDate, paintSlot, workoutsForDay, type FrontId, type Week, type Routine, type TrainingType } from '@/lib/weekPlan';
export default function WeekPlanner({week,update,routines,copy,disabled}:{week:Week;update:(p:Partial<Week>)=>void;routines:Routine[];copy:()=>void;disabled:boolean}) {
 const [brush,setBrush]=useState<FrontId|'clear'>('play');
 return <div className="space-y-7">
  <section className="space-y-3"><h2 className="font-display text-xl font-semibold">Empresas e frentes</h2>
   <div className="flex flex-wrap gap-2">{FRONTS.map(f=><Button key={f.id} variant="outline" aria-pressed={brush===f.id} onClick={()=>setBrush(f.id)} className={`h-11 week-brush front-${f.id} ${brush===f.id?'ring-2 ring-ring':''}`}><span className={`h-2.5 w-2.5 rounded-full week-color front-${f.id}`}/>{f.name}</Button>)}
   <Button variant={brush==='clear'?'secondary':'outline'} onClick={()=>setBrush('clear')} aria-pressed={brush==='clear'} className="h-11"><Eraser/>Liberar</Button></div>
   <div className="grid grid-cols-[72px_1fr_1fr] gap-2 items-stretch">
    <span/><span className="text-xs text-muted-foreground text-center">Manhã · 8h–12h</span><span className="text-xs text-muted-foreground text-center">Tarde · 14h–18h</span>
    {DAY_NAMES.slice(0,5).map((name,day)=>{const iso=shiftDate(week.semana_inicio,day);return <div key={day} className="contents"><div className="flex flex-col justify-center text-sm"><strong>{name.slice(0,3)}</strong><span className="text-muted-foreground text-xs">{iso.slice(8)}/{iso.slice(5,7)}</span>{HOLIDAYS[iso]&&<span className="text-[10px] text-accent leading-tight mt-1">{HOLIDAYS[iso]}</span>}</div>
    {['m','t'].map(period=>{const key=`${day}${period}`,fronts=week.slots[key]||[];return <Button key={key} variant="outline" disabled={disabled} aria-label={`${name} ${period==='m'?'manhã':'tarde'}`} onClick={()=>update({slots:paintSlot(week.slots,key,brush)})} className="relative min-h-[76px] h-auto py-3 px-3 justify-start whitespace-normal overflow-hidden bg-card hover:bg-secondary hover:text-foreground"><span className="absolute inset-y-0 left-0 w-1 flex flex-col">{fronts.map(id=><span key={id} className={`flex-1 week-color front-${id}`}/>)}</span><span className="flex flex-col text-left text-xs gap-1">{fronts.length?fronts.map(id=><span key={id} className={`week-front-text front-${id}`}>{FRONTS.find(f=>f.id===id)?.name}</span>):<span className="text-muted-foreground">Livre</span>}</span></Button>;})}</div>;})}
   </div>
   <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">{FRONTS.map(f=>{const count=Object.values(week.slots).filter(v=>v.includes(f.id)).length;return count?<span key={f.id}>{f.name} <strong className="text-foreground">{count}</strong> {count===1?'período':'períodos'}</span>:null;})}</div>
  </section>
  <section className="space-y-3"><h2 className="font-display text-xl font-semibold">Treinos</h2><p className="text-xs text-muted-foreground">Surf e wake dependem do mar: se não der, troque pelo treino do dia.</p>
   {DAY_NAMES.map((name,day)=>{const existing=workoutsForDay(routines,shiftDate(week.semana_inicio,day));const training=week.treinos[String(day)];return <div key={day} className="border-b border-border pb-3"><div className="grid grid-cols-[64px_1fr_92px] gap-2 items-center"><span className="text-sm">{name.slice(0,3)}</span>{existing.length?<span className="text-xs font-medium">{existing.map(r=>r.title).join(' · ')}<span className="block text-muted-foreground">Em Rotinas</span></span>:<Select disabled={disabled} value={training?.tipo||'none'} onValueChange={value=>{const treinos={...week.treinos};if(value==='none')delete treinos[String(day)];else treinos[String(day)]={tipo:value as TrainingType,hora:training?.hora||'06:00'};update({treinos});}}><SelectTrigger aria-label={`Treino ${name}`} className="h-11"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Sem treino</SelectItem>{Object.entries(TRAININGS).map(([id,label])=><SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select>}
   <Input type="time" aria-label={`Horário ${name}`} className="h-11 px-1 min-w-0" disabled={disabled||Boolean(existing.length)||!training} value={existing[0]?.time||training?.hora||'06:00'} onChange={e=>{if(training)update({treinos:{...week.treinos,[day]:{...training,hora:e.target.value}}});}}/></div></div>;})}
  </section>
  <section className="space-y-3"><h2 className="font-display text-xl font-semibold flex gap-2 items-center"><BookOpen className="h-5 w-5"/>Leitura</h2><div className="flex items-center justify-between gap-3"><label htmlFor="daily-reading" className="text-sm">Ler todos os dias</label><Switch id="daily-reading" disabled={disabled} checked={week.leitura.on} onCheckedChange={on=>update({leitura:{...week.leitura,on}})}/><Input type="time" aria-label="Horário da leitura" disabled={disabled||!week.leitura.on} value={week.leitura.hora} onChange={e=>update({leitura:{...week.leitura,hora:e.target.value}})} className="w-28 h-11"/></div></section>
  <Button variant="outline" className="w-full h-12" disabled={disabled} onClick={copy}><Copy/>Copiar a semana anterior</Button>
 </div>;
}
