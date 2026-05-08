/**
 * Fechas de vencimiento de cuota mensual a partir del inicio del contrato.
 * Todas las fechas “de negocio” usan el calendario de Perú (America/Lima, sin DST).
 */

export const PERU_TIMEZONE = 'America/Lima';

/**
 * Instantánea UTC → YYYY-MM-DD según calendario en Perú.
 * @param {Date} date
 * @returns {string|null}
 */
export function toPeruCalendarYMD(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PERU_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const pick = (t) => parts.find((p) => p.type === t)?.value;
  const y = pick('year');
  const mo = pick('month');
  const da = pick('day');
  if (!y || !mo || !da) return null;
  return `${y}-${mo}-${da}`;
}

/** YYYY-MM-DD “hoy” en Perú (según reloj del sistema). */
export function todayPeruISO() {
  return toPeruCalendarYMD(new Date()) ?? '';
}

function daysInMonth(year, monthIndex0) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function clampDayOfMonth(year, month1based, anchorDay) {
  const last = daysInMonth(year, month1based - 1);
  return Math.min(anchorDay, last);
}

function parseCalendarYMD(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function cmpYMD(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function formatParts({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Mes(es) siguiente(s) preservando día de ciclo mensual (p. ej. 31→feb 28).
 * month 1–12 en entrada y salida.
 */
function calendarAddMonths(year, month, dayAnchor, delta) {
  const idx = month - 1 + delta;
  const yAdj = year + Math.floor(idx / 12);
  const m0 = ((idx % 12) + 12) % 12;
  const dAdj = clampDayOfMonth(yAdj, m0 + 1, dayAnchor);
  return { year: yAdj, month: m0 + 1, day: dAdj };
}

function advanceCalendarMonth(year, month) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function contractStartDateISO(startDate) {
  if (startDate == null || startDate === '') return null;

  if (typeof startDate === 'number' && Number.isFinite(startDate)) {
    const d = new Date(startDate);
    return Number.isNaN(d.getTime()) ? null : toPeruCalendarYMD(d);
  }

  if (typeof startDate === 'string') {
    const t = startDate.trim();
    /** Solo día: fecha “de contrato”; no usar Date.parse (trata UTC y desfasa un día en Lima). */
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      const cal = parseCalendarYMD(t);
      return cal ? formatParts(cal) : null;
    }
    const parsed = Date.parse(t);
    return Number.isNaN(parsed) ? null : toPeruCalendarYMD(new Date(parsed));
  }

  if (typeof startDate === 'object') {
    try {
      if (typeof startDate.toDate === 'function') return toPeruCalendarYMD(startDate.toDate());
      if (typeof startDate.toMillis === 'function')
        return toPeruCalendarYMD(new Date(startDate.toMillis()));

      const sec = typeof startDate.seconds === 'number' ? startDate.seconds : startDate._seconds;
      if (typeof sec === 'number') {
        const ns =
          typeof startDate.nanoseconds === 'number'
            ? startDate.nanoseconds
            : typeof startDate._nanoseconds === 'number'
              ? startDate._nanoseconds
              : 0;
        const ms = sec * 1000 + Math.floor(ns / 1e6);
        return toPeruCalendarYMD(new Date(ms));
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Próximo vencimiento recurrente (mismo día del mes que la fecha de inicio del contrato).
 * Calendario y “hoy” en Perú.
 * - Si el contrato empieza **hoy** (Lima), el primer vencimiento de ciclo mensual es el mismo día del **mes siguiente**.
 * - En otros casos: primer vencimiento ≥ hoy (Lima).
 * Si ese día no existe en el mes (ej. 31 en febrero), usa el último día del mes.
 * @returns {string|null} YYYY-MM-DD
 */
export function nextMonthlyDueDateISO(startDateRaw) {
  const startStr = contractStartDateISO(startDateRaw);
  if (!startStr) return null;

  const startCal = parseCalendarYMD(startStr);
  const todayStr = toPeruCalendarYMD(new Date());
  const todayCal = todayStr ? parseCalendarYMD(todayStr) : null;
  if (!startCal || !todayCal) return null;

  const anchorDay = startCal.day;

  // Todavía no llega la fecha de inicio del contrato (Lima): el primer hito mostrado es el día de inicio.
  if (cmpYMD(todayCal, startCal) < 0) {
    return formatParts(startCal);
  }

  // Contrato iniciado hoy (Lima) → primer vencimiento de ciclo: mes siguiente (no el día de firma).
  if (startStr === todayStr) {
    const next = calendarAddMonths(startCal.year, startCal.month, anchorDay, 1);
    return formatParts(next);
  }

  let y = todayCal.year;
  let m = todayCal.month;
  for (let guard = 0; guard < 500; guard++) {
    const d = clampDayOfMonth(y, m, anchorDay);
    const candidate = { year: y, month: m, day: d };
    if (cmpYMD(candidate, todayCal) >= 0) return formatParts(candidate);
    ({ year: y, month: m } = advanceCalendarMonth(y, m));
  }

  return null;
}
