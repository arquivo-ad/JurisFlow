// ==========================================
// JURISFLOW - iCALENDAR (.ics) EXPORT ENGINE
// RFC 5545 Standard for Legal Agendas, Deadlines & Hearings
// ==========================================

import { Deadline, Hearing, Diligence } from '../types';

function formatToICSDate(dateStr: string, isAllDay = false): string {
  // If dateStr is YYYY-MM-DD
  if (dateStr.length === 10) {
    const clean = dateStr.replace(/-/g, '');
    return isAllDay ? clean : `${clean}T090000Z`;
  }
  // If dateStr has time like YYYY-MM-DDTHH:mm or ISO
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr.replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function exportDeadlineToICS(deadline: Deadline): string {
  const dtStart = formatToICSDate(deadline.dueDate, false);
  const dtEnd = formatToICSDate(deadline.dueDate, false);
  const now = formatToICSDate(new Date().toISOString());

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JurisFlow LegalTech//Agenda Processual//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:dl-${deadline.id}@jurisflow.legal`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:🚨 [PRAZO FATAL] ${escapeICSText(deadline.title)}`,
    `DESCRIPTION:Processo: ${escapeICSText(deadline.caseTitle || deadline.caseNumber || 'N/A')}\\nData Fatal: ${deadline.dueDate}\\nContagem: ${deadline.daysCount} dias (${deadline.calculationType})\\nResponsável: ${escapeICSText(deadline.responsibleUserName || 'Banca')}\\nDetalhes: ${escapeICSText(deadline.description || '')}`,
    `LOCATION:${escapeICSText(deadline.caseNumber || 'Tribunal de Justiça')}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Lembrete de Prazo Fatal Amanhã: ${escapeICSText(deadline.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return ics;
}

export function exportHearingToICS(hearing: Hearing): string {
  const dtStart = formatToICSDate(hearing.dateTime);
  const startDate = new Date(hearing.dateTime);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
  const dtEnd = formatToICSDate(endDate.toISOString());
  const now = formatToICSDate(new Date().toISOString());

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JurisFlow LegalTech//Audiências Forenses//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:hr-${hearing.id}@jurisflow.legal`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:⚖️ [AUDIÊNCIA] ${escapeICSText(hearing.title)} - ${escapeICSText(hearing.courtName || '')}`,
    `DESCRIPTION:Processo: ${escapeICSText(hearing.caseTitle || hearing.caseNumber || 'N/A')}\\nModalidade: ${hearing.locationType}\\nEndereço/Link: ${escapeICSText(hearing.addressOrLink || '')}\\nAdvogado: ${escapeICSText(hearing.responsibleLawyerName || 'Advogado Responsável')}`,
    `LOCATION:${escapeICSText(hearing.addressOrLink || hearing.courtName || 'Sala Virtual')}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Lembrete de Audiência em 2 horas: ${escapeICSText(hearing.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return ics;
}

export function exportFullAgendaToICS(params: {
  deadlines: Deadline[];
  hearings: Hearing[];
  diligences: Diligence[];
}): string {
  const now = formatToICSDate(new Date().toISOString());

  const events: string[] = [];

  params.deadlines.forEach((dl) => {
    const dtStart = formatToICSDate(dl.dueDate);
    events.push(
      [
        'BEGIN:VEVENT',
        `UID:dl-${dl.id}@jurisflow.legal`,
        `DTSTAMP:${now}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtStart}`,
        `SUMMARY:🚨 [PRAZO FATAL] ${escapeICSText(dl.title)}`,
        `DESCRIPTION:Processo: ${escapeICSText(dl.caseTitle || dl.caseNumber || 'N/A')}\\nData Fatal: ${dl.dueDate}\\nContagem: ${dl.daysCount} dias (${dl.calculationType})\\nResponsável: ${escapeICSText(dl.responsibleUserName || 'Banca')}`,
        `LOCATION:${escapeICSText(dl.caseNumber || 'Tribunal')}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n')
    );
  });

  params.hearings.forEach((hr) => {
    const dtStart = formatToICSDate(hr.dateTime);
    const startDate = new Date(hr.dateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const dtEnd = formatToICSDate(endDate.toISOString());

    events.push(
      [
        'BEGIN:VEVENT',
        `UID:hr-${hr.id}@jurisflow.legal`,
        `DTSTAMP:${now}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:⚖️ [AUDIÊNCIA] ${escapeICSText(hr.title)} (${hr.locationType})`,
        `DESCRIPTION:Processo: ${escapeICSText(hr.caseTitle || hr.caseNumber || 'N/A')}\\nTribunal: ${escapeICSText(hr.courtName || '')}\\nLocal/Link: ${escapeICSText(hr.addressOrLink || '')}`,
        `LOCATION:${escapeICSText(hr.addressOrLink || hr.courtName || 'Fórum')}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n')
    );
  });

  params.diligences.forEach((dil) => {
    const dStr = dil.dueDate || dil.date || new Date().toISOString().slice(0, 10);
    const dtStart = formatToICSDate(dStr);
    events.push(
      [
        'BEGIN:VEVENT',
        `UID:dil-${dil.id}@jurisflow.legal`,
        `DTSTAMP:${now}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtStart}`,
        `SUMMARY:📌 [DILIGÊNCIA] ${escapeICSText(dil.title)}`,
        `DESCRIPTION:Tipo: ${dil.type || 'Forense'}\\nProcesso: ${escapeICSText(dil.caseNumber || 'N/A')}\\nLocal: ${escapeICSText(dil.location || '')}\\nNotas: ${escapeICSText(dil.notes || '')}`,
        `LOCATION:${escapeICSText(dil.location || 'Fórum / Cartório')}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n')
    );
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JurisFlow LegalTech//Agenda Completa//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:JurisFlow - Agenda Forense Integrada',
    'X-WR-TIMEZONE:America/Sao_Paulo',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICSFile(filename: string, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
