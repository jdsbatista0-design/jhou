import {describe,it,expect} from 'vitest';
import {saoPauloDateTime,googleAgendaEntry,entryOnDay,isWeekEvent} from '../../supabase/functions/_shared/googleAgenda';
describe('Google agenda',()=>{
 it('preserva 08h e 14h de São Paulo mesmo com resposta UTC',()=>{
  expect(saoPauloDateTime('2026-11-18T11:00:00Z')).toBe('2026-11-18T08:00');
  expect(saoPauloDateTime('2026-11-18T17:00:00Z')).toBe('2026-11-18T14:00');
 });
 it('mantém leitura às 21h30 no dia correto',()=>{expect(saoPauloDateTime('2026-11-19T00:30:00Z')).toBe('2026-11-18T21:30');});
 it('mantém duração de quatro horas e origem externa',()=>{
  const e=googleAgendaEntry({id:'a',start:{dateTime:'2026-11-18T11:00:00Z'},end:{dateTime:'2026-11-18T15:00:00Z'}},{id:'outside',summary:'Family'});
  expect(e?.datetime).toBe('2026-11-18T08:00');expect(e?.endDatetime).toBe('2026-11-18T12:00');expect(e?.calendarName).toBe('Family');expect(e?.source).toBe('google');
 });
 it('exibe todos os dias de evento dia inteiro com fim exclusivo',()=>{
  const e={datetime:'2026-10-21',endDatetime:'2026-10-24',allDay:true};
  expect(['2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24'].map(day=>entryOnDay(e,day))).toEqual([false,true,true,true,false]);
 });
 it('ignora cancelados',()=>{expect(googleAgendaEntry({id:'a',status:'cancelled',start:{date:'2026-11-18'}},{id:'outside'})).toBeNull();});
 it('identifica semanal antigo e novo para impedir reenvio como item',()=>{
  expect(isWeekEvent({id:'a',description:'Planejado [minha-semana 2026-11-16]'})).toBe(true);
  expect(isWeekEvent({id:'b',extendedProperties:{private:{centralWeekId:'week'}}})).toBe(true);
  expect(isWeekEvent({id:'c',description:'Dentista'})).toBe(false);
 });
});