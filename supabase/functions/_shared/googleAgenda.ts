export type GoogleEvent = {
 id: string; summary?: string; description?: string; status?: string; htmlLink?: string; iCalUID?: string;
 start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string };
 extendedProperties?: { private?: Record<string, string> };
};
export function isWeekEvent(event: GoogleEvent) {
 return Boolean(event.extendedProperties?.private?.centralWeekId || /\[minha-semana \d{4}-\d{2}-\d{2}\]/.test(event.description || ''));
}
export function saoPauloDateTime(timestamp: string) {
 const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(new Date(timestamp));
 const part = (name: string) => parts.find(p=>p.type===name)?.value || '';
 return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
export function googleAgendaEntry(event: GoogleEvent, calendar: {id:string;summary?:string}) {
 if(event.status==='cancelled' || !event.start) return null;
 const datetime = event.start.dateTime ? saoPauloDateTime(event.start.dateTime) : event.start.date;
 if(!datetime) return null;
 return { id:`google-${calendar.id}-${event.id}`, source:'google' as const, sourceId:event.id, title:event.summary || '(sem título)', type:'Compromisso', datetime,
   endDatetime:event.end?.dateTime ? saoPauloDateTime(event.end.dateTime) : event.end?.date,
   allDay:Boolean(event.start.date), calendarName:calendar.summary || 'Google Agenda',
   googleItemId:event.extendedProperties?.private?.centralItemId, iCalUID:event.iCalUID,
   htmlLink:event.htmlLink?.startsWith('https://www.google.com/calendar/') ? event.htmlLink : undefined };
}
export function entryOnDay(entry: {datetime:string;endDatetime?:string;allDay?:boolean}, day:string) {
 const start=entry.datetime.slice(0,10);
 if(entry.allDay) return start<=day && (entry.endDatetime ? day<entry.endDatetime.slice(0,10) : day===start);
 return start===day || (start<day && Boolean(entry.endDatetime && entry.endDatetime>`${day}T00:00`));
}