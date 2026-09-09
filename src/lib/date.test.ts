import { describe, expect, it } from 'vitest';
import { dayKey, keyOf, monthGrid, weeksIn } from './date';

describe('dayKey', () => {
  it('pads month and day', () => {
    expect(dayKey(2026, 0, 1)).toBe('2026-01-01');
    expect(dayKey(2026, 11, 25)).toBe('2026-12-25');
  });

  it('uses local time, not UTC', () => {
    // A late-evening date in a negative-offset zone would roll forward a day
    // under toISOString(); the key must stay on the local calendar day.
    const late = new Date(2026, 8, 10, 23, 30);
    expect(keyOf(late)).toBe('2026-09-10');
  });
});

describe('monthGrid', () => {
  it('always produces whole weeks', () => {
    for (let m = 0; m < 12; m++) {
      const cells = monthGrid(2026, m);
      expect(cells.length % 7).toBe(0);
      expect(weeksIn(cells)).toBeGreaterThanOrEqual(4);
    }
  });

  it('keys only the days of the month itself', () => {
    // September 2026 starts on a Tuesday, so there are two lead-in days.
    const cells = monthGrid(2026, 8);
    const keyed = cells.filter((c) => c.key !== null);
    expect(keyed).toHaveLength(30);
    expect(keyed[0].key).toBe('2026-09-01');
    expect(keyed[29].key).toBe('2026-09-30');
    expect(cells[0].key).toBeNull();
  });

  it('marks today once, and only against the month on screen', () => {
    const today = new Date(2026, 8, 10);
    const september = monthGrid(2026, 8, today);
    expect(september.filter((c) => c.isToday)).toHaveLength(1);
    expect(september.find((c) => c.isToday)?.day).toBe(10);

    // The 10th of an adjacent month must not light up.
    expect(monthGrid(2026, 9, today).filter((c) => c.isToday)).toHaveLength(0);
  });

  it('handles a leap February', () => {
    expect(monthGrid(2028, 1).filter((c) => c.key !== null)).toHaveLength(29);
    expect(monthGrid(2026, 1).filter((c) => c.key !== null)).toHaveLength(28);
  });
});
