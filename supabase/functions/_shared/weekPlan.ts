import { z } from 'zod';

export const FRONTS = [
  { id: 'play', name: 'Play Balão', colorId: '6' },
  { id: 'izi', name: 'Izi', colorId: '3' },
  { id: 'paineis', name: 'BJ7 Painéis', colorId: '9' },
  { id: 'stone', name: 'Stone', colorId: '10' },
  { id: 'incorp', name: 'Incorporadora', colorId: '7' },
  { id: 'usina', name: 'Usina', colorId: '5' },
  { id: 'projetos', name: 'Projetos', colorId: '8' },
  { id: 'casa', name: 'Casa', colorId: '4' },
] as const;
export const TRAININGS = { natacao: 'Natação', corrida: 'Corrida', surf: 'Surf', wake: 'Wake' };
export const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const HOLIDAYS: Record<string, string> = {
 '2026-11-20': 'Consciência Negra', '2026-12-25': 'Natal', '2027-01-01': 'Ano-novo',
 '2027-02-08': 'Carnaval', '2027-02-09': 'Carnaval', '2027-03-26': 'Sexta-feira Santa',
 '2027-04-21': 'Tiradentes', '2027-05-01': 'Dia do Trabalho', '2027-05-27': 'Corpus Christi',
 '2027-09-07': 'Independência', '2027-10-12': 'Aparecida', '2027-11-02': 'Finados',
 '2027-11-15': 'República', '2027-11-20': 'Consciência Negra', '2027-12-25': 'Natal',
};
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
 const d = new Date(`${v}T12:00:00Z`); return !isNaN(d.getTime()) && d.toISOString().slice(0,10) === v;
});
export const mondaySchema = dateSchema.refine(v => new Date(`${v}T12:00:00Z`).getUTCDay() === 1);
export const planSchema = z.object({
 slots: z.record(z.string().regex(/^[0-4][mt]$/), z.array(z.enum(['play','izi','paineis','stone','incorp','usina','projetos','casa'])).max(8).refine(a => new Set(a).size === a.length)),
 treinos: z.record(z.string().regex(/^[0-6]$/), z.object({ tipo: z.enum(['natacao','corrida','surf','wake']), hora: time })),
 leitura: z.object({ on: z.boolean(), hora: time }),
});
export type Plan = z.infer<typeof planSchema>;
export type FrontId = typeof FRONTS[number]['id'];
export type TrainingType = keyof typeof TRAININGS;
export type WeekSync = { at?: string; eventIds?: string[]; count?: number; calendarId?: string; busy?: string; partial?: boolean };
export type Week = Plan & { id?: string; semana_inicio: string; editado_em?: string; sync: WeekSync };
export const HABITS = [
 { key: 'treino', label: 'Treino feito' }, { key: 'leitura', label: 'Leitura' },
 { key: 'jantar', label: 'Jantar em família' }, { key: 'programa', label: 'Programa com a família' },
 { key: 'fe', label: 'Prática de fé' },
] as const;
export type Habit = typeof HABITS[number]['key'];
export type DayRecord = { data: string } & Record<Habit, boolean>;
export const emptyDay = (data: string): DayRecord => ({ data, treino: false, leitura: false, jantar: false, programa: false, fe: false });
export const emptyWeek = (semana_inicio: string): Week => ({ semana_inicio, slots: {}, treinos: {}, leitura: { on:false, hora:'21:30' }, sync:{} });
export function shiftDate(iso: string, days: number) {
 const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10);
}
export function mondayOf(iso: string) {
 const day = new Date(`${iso}T12:00:00Z`).getUTCDay(); return shiftDate(iso, -(day === 0 ? 6 : day - 1));
}
export function initialWeek(iso: string) {
 const day = new Date(`${iso}T12:00:00Z`).getUTCDay(); return shiftDate(mondayOf(iso), day === 0 || day === 6 ? 7 : 0);
}
export function saoPauloToday(now = new Date()) {
 return new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(now);
}
export function paintSlot(slots: Plan['slots'], slot: string, front: FrontId | 'clear') {
 const current = slots[slot] || [];
 return { ...slots, [slot]: front === 'clear' ? [] : current.includes(front) ? current.filter(f => f !== front) : [...current, front] };
}
export type Routine = { id: string; title: string; weekdays: number[]; time: string; startDate: string; endDate?: string; active: boolean };
export function workoutsForDay(routines: Routine[], iso: string) {
 const weekday = new Date(`${iso}T12:00:00Z`).getUTCDay() || 7;
 return routines.filter(r => r.active && r.startDate <= iso && (!r.endDate || r.endDate >= iso) && r.weekdays.includes(weekday) && /nata[çc][aã]o|corrida|surf|wake|pilates|treino|academia|muscula[çc][aã]o/i.test(r.title));
}
export function declining(counts: number[]) { return counts[2] < counts[1] && counts[1] < counts[0]; }
export function habitMonths(records: DayRecord[], today: string) {
 const anchor = new Date(`${today.slice(0,7)}-01T12:00:00Z`);
 return [-3,-2,-1,0].map(offset => {
  const d = new Date(anchor); d.setUTCMonth(d.getUTCMonth()+offset); const month = d.toISOString().slice(0,7);
  return { month, counts: Object.fromEntries(HABITS.map(h => [h.key, records.filter(r => r.data.startsWith(month) && r[h.key]).length])) as Record<Habit,number> };
 });
}
export type CalendarEvent = {
 summary: string; description: string; colorId: string;
 start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string };
 reminders: { useDefault: boolean; overrides: { method: string; minutes: number }[] };
};
export function buildWeekEvents(monday: string, plan: Plan, routines: Routine[] = []): CalendarEvent[] {
 const events: CalendarEvent[] = [];
 const tag = `[minha-semana ${monday}]`;
 function add(day: number, hour: string, duration: number, summary: string, colorId: string, description: string, reminder?: number) {
  const date = shiftDate(monday, day);
  const start = new Date(`${date}T${hour}:00-03:00`);
  const end = new Date(start.getTime() + duration*60000);
  // Fixed UTC-3 for the requested 2026–2027 São Paulo dates; preserve local date across midnight.
  const localEnd = new Date(end.getTime()-3*3600000).toISOString().slice(0,19)+'-03:00';
  events.push({ summary, colorId, description: `${description} ${tag}`.trim(),
   start: { dateTime:`${date}T${hour}:00-03:00`, timeZone:'America/Sao_Paulo' },
   end: { dateTime:localEnd, timeZone:'America/Sao_Paulo' },
   reminders: { useDefault:false, overrides: reminder === undefined ? [] : [{ method:'popup', minutes:reminder }] },
  });
 }
 for (let day=0; day<5; day++) for (const period of ['m','t']) {
  const fronts = (plan.slots[`${day}${period}`] || []).map(id => FRONTS.find(f=>f.id===id)).filter((f): f is typeof FRONTS[number] => Boolean(f));
  if (!fronts.length) continue;
  const names = fronts.map(f=>f.name);
  const list = names.length > 1 ? `Neste período: ${names.slice(0,-1).join(', ')} e ${names.at(-1)}. ` : '';
  add(day, period==='m'?'08:00':'14:00',240,names.join(' · '),fronts[0].colorId,`${list}Planejado no Minha semana (RAIZ). Bloco se troca, não se soma.`);
 }
 for (let day=0;day<7;day++) {
  const training = plan.treinos[String(day)];
  if (training && !workoutsForDay(routines,shiftDate(monday,day)).length) add(day,training.hora,training.tipo==='surf'||training.tipo==='wake'?90:60,TRAININGS[training.tipo],'2','Planejado no Minha semana (RAIZ).',15);
  if (plan.leitura.on) add(day,plan.leitura.hora,30,'Leitura','1','Planejado no Minha semana (RAIZ).',0);
 }
 return events;
}
