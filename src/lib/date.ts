/** Local-time ISO day key, e.g. `2026-09-10`. Deliberately not
 *  `toISOString()`, which shifts to UTC and can land on the wrong day. */
export const dayKey = (y: number, m: number, d: number): string =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export const keyOf = (date: Date): string =>
  dayKey(date.getFullYear(), date.getMonth(), date.getDate());

export const isSameDay = (a: Date, b: Date): boolean => keyOf(a) === keyOf(b);

export const monthLabel = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** Single-letter day headers, Sunday first. */
export const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export interface MonthCell {
  day: number;
  /** null for the adjacent-month days shown only to keep weeks aligned. */
  key: string | null;
  isToday: boolean;
}

/** The full grid for a month: lead-in, the month itself, then trail-out, so
 *  the result is always a whole number of weeks. */
export function monthGrid(year: number, month: number, today = new Date()): MonthCell[] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: MonthCell[] = [];

  for (let i = first - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, key: null, isToday: false });
  }
  for (let d = 1; d <= days; d++) {
    cells.push({
      day: d,
      key: dayKey(year, month, d),
      isToday:
        d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear(),
    });
  }
  const trail = (7 - ((first + days) % 7)) % 7;
  for (let d = 1; d <= trail; d++) {
    cells.push({ day: d, key: null, isToday: false });
  }
  return cells;
}

export const weeksIn = (cells: MonthCell[]): number => cells.length / 7;
