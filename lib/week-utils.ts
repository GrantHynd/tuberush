const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Monday-Sunday week containing the given date. */
export function getWeekRange(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateString(monday), end: toDateString(sunday) };
}

export function getCurrentWeek(): { start: string; end: string } {
  return getWeekRange(new Date());
}

/**
 * "Week of 9–15 Mar 2026"
 * If the week spans two months: "Week of 28 Apr – 4 May 2026"
 */
export function getWeekLabel(start: string, end: string): string {
  const s = parseDate(start);
  const e = parseDate(end);
  const sMonth = MONTHS[s.getMonth()];
  const eMonth = MONTHS[e.getMonth()];
  const year = e.getFullYear();

  if (sMonth === eMonth) {
    return `Week of ${s.getDate()}–${e.getDate()} ${eMonth} ${year}`;
  }
  return `Week of ${s.getDate()} ${sMonth} – ${e.getDate()} ${eMonth} ${year}`;
}

export function shiftWeek(
  start: string,
  direction: -1 | 1
): { start: string; end: string } {
  const d = parseDate(start);
  d.setDate(d.getDate() + direction * 7);
  return getWeekRange(d);
}

export function isCurrentWeek(start: string): boolean {
  return start === getCurrentWeek().start;
}
