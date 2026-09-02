// ==========================================
// JURISFLOW - BRAZILIAN LEGAL CALENDAR & DEADLINE ENGINE
// CPC/2015 (Art. 219/224) & CLT (Art. 775)
// ==========================================

export interface NationalHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  isRecess?: boolean;
}

// Fixed Brazilian national holidays + Judiciary recess
export const FIXED_BRAZILIAN_HOLIDAYS: NationalHoliday[] = [
  { date: '01-01', name: 'Confraternização Universal' },
  { date: '04-21', name: 'Tiradentes' },
  { date: '05-01', name: 'Dia do Trabalho' },
  { date: '08-11', name: 'Dia do Advogado / Criação dos Cursos Jurídicos' },
  { date: '09-07', name: 'Independência do Brasil' },
  { date: '10-12', name: 'Nossa Senhora Aparecida' },
  { date: '10-28', name: 'Dia do Servidor Público' },
  { date: '11-02', name: 'Finados' },
  { date: '11-15', name: 'Proclamação da República' },
  { date: '11-20', name: 'Dia Nacional de Zumbi e da Consciência Negra' },
  { date: '12-08', name: 'Dia da Justiça' },
  { date: '12-25', name: 'Natal' },
];

/**
 * Checks if a given date falls within the judicial suspension recess (20 Dec to 20 Jan - Art. 220 CPC)
 */
export function isJudicialRecess(date: Date): boolean {
  const month = date.getMonth(); // 0 = Jan, 11 = Dec
  const day = date.getDate();

  // Dec 20 to Dec 31
  if (month === 11 && day >= 20) return true;
  // Jan 1 to Jan 20
  if (month === 0 && day <= 20) return true;

  return false;
}

/**
 * Checks if a given date is weekend (Saturday = 6, Sunday = 0)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Checks if a given date is a national holiday
 */
export function isHoliday(date: Date): { isHoliday: boolean; holidayName?: string } {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const monthDay = `${month}-${day}`;

  const found = FIXED_BRAZILIAN_HOLIDAYS.find(h => h.date === monthDay);
  if (found) {
    return { isHoliday: true, holidayName: found.name };
  }

  // Dynamic mobile holidays check (Carnaval, Sexta-feira Santa, Corpus Christi)
  const year = date.getFullYear();
  const easter = getEasterDate(year);
  
  // Carnival Tuesday (47 days before Easter)
  const carnival = new Date(easter);
  carnival.setDate(easter.getDate() - 47);
  // Carnival Monday
  const carnivalMon = new Date(easter);
  carnivalMon.setDate(easter.getDate() - 48);
  // Good Friday (2 days before Easter)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  // Corpus Christi (60 days after Easter)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);

  const dateStr = formatDateToYMD(date);
  if (dateStr === formatDateToYMD(carnival) || dateStr === formatDateToYMD(carnivalMon)) {
    return { isHoliday: true, holidayName: 'Carnaval (Feriado Forense)' };
  }
  if (dateStr === formatDateToYMD(goodFriday)) {
    return { isHoliday: true, holidayName: 'Sexta-feira Santa' };
  }
  if (dateStr === formatDateToYMD(corpusChristi)) {
    return { isHoliday: true, holidayName: 'Corpus Christi' };
  }

  return { isHoliday: false };
}

/**
 * Computes Easter Sunday for a given year (Meeus/Jones/Butcher algorithm)
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/**
 * Determines if a date is a valid Brazilian legal business day (Dia Útil Processual)
 */
export function isLegalBusinessDay(date: Date, considerRecess: boolean = true): boolean {
  if (isWeekend(date)) return false;
  if (considerRecess && isJudicialRecess(date)) return false;
  if (isHoliday(date).isHoliday) return false;
  return true;
}

/**
 * Gets the next legal business day on or after the given date
 */
export function getNextLegalBusinessDay(date: Date, considerRecess: boolean = true): Date {
  const current = new Date(date);
  while (!isLegalBusinessDay(current, considerRecess)) {
    current.setDate(current.getDate() + 1);
  }
  return current;
}

/**
 * Calculates a legal deadline according to CPC/2015 Art. 219/224 or CLT Art. 775
 * 
 * @param publishDateStr Date of DJe/DJEN publication (e.g. '2026-09-01')
 * @param daysCount Number of days (e.g. 5 for Embargos, 15 for Apelação/Contestação)
 * @param type 'DIAS_UTEIS_CPC' | 'DIAS_CORRIDOS' | 'DIAS_UTEIS_CLT'
 */
export function calculateLegalDeadline(
  publishDateStr: string,
  daysCount: number,
  type: 'DIAS_UTEIS_CPC' | 'DIAS_CORRIDOS' | 'DIAS_UTEIS_CLT' = 'DIAS_UTEIS_CPC'
): {
  publishDate: string;
  startDate: string;
  dueDate: string;
  fatalDate: string;
  businessDaysCounted: number;
  recessIncluded: boolean;
  notes: string[];
} {
  const [y, m, d] = publishDateStr.split('-').map(Number);
  const pubDate = new Date(y, m - 1, d);
  const notes: string[] = [];

  // D0 = Data de disponibilização/publicação
  // Termo Inicial (D+1): primeiro dia útil seguinte
  const startCountingDate = new Date(pubDate);
  startCountingDate.setDate(startCountingDate.getDate() + 1);
  
  const actualStartDate = getNextLegalBusinessDay(startCountingDate, true);
  notes.push(`Publicação disponibilizada em ${formatDateBR(pubDate)} (D0).`);
  notes.push(`Início da contagem do prazo em ${formatDateBR(actualStartDate)} (D+1 útil - CPC Art. 224, § 2º).`);

  let currentDate = new Date(actualStartDate);
  let daysAdded = 0;
  let recessIncluded = false;

  if (type === 'DIAS_CORRIDOS') {
    currentDate.setDate(currentDate.getDate() + daysCount - 1);
    // If ends on non-business day, prorogates to next business day
    if (!isLegalBusinessDay(currentDate, true)) {
      notes.push(`Vencimento original recaiu em dia não útil; prorrogado para o 1º dia útil subsequente.`);
      currentDate = getNextLegalBusinessDay(currentDate, true);
    }
  } else {
    // CPC or CLT: Business days only
    while (daysAdded < daysCount) {
      if (isLegalBusinessDay(currentDate, true)) {
        daysAdded++;
        if (daysAdded === daysCount) {
          break;
        }
      } else if (isJudicialRecess(currentDate)) {
        recessIncluded = true;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const dueDateStr = formatDateToYMD(currentDate);
  // Fatal date is the same, but gives 23:59:59 time window
  const fatalDateStr = dueDateStr;

  if (recessIncluded) {
    notes.push(`Atenção: Houve suspensão de prazos durante o Recesso Judiciário Forense (Art. 220 do CPC).`);
  }

  return {
    publishDate: publishDateStr,
    startDate: formatDateToYMD(actualStartDate),
    dueDate: dueDateStr,
    fatalDate: fatalDateStr,
    businessDaysCounted: daysCount,
    recessIncluded,
    notes,
  };
}

export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateBR(dateInput: Date | string): string {
  if (!dateInput) return '-';
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const d = new Date(dateInput);
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTimeBR(dateInput: string): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  return `${d.toLocaleDateString('pt-BR')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatCNJ(caseNumber: string): string {
  if (!caseNumber) return '';
  const clean = caseNumber.replace(/\D/g, '');
  if (clean.length === 20) {
    // 0000000-00.0000.8.00.0000
    return `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(13, 14)}.${clean.slice(14, 16)}.${clean.slice(16, 20)}`;
  }
  return caseNumber;
}

export function formatCPFCNPJ(doc: string): string {
  if (!doc) return '';
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) {
    // CPF
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  }
  if (clean.length === 14) {
    // CNPJ
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
  }
  return doc;
}
