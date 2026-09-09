import type { AppState, Board, Card, CardType, Layout, Swatch, Theme } from '../types';
import { uid } from './uid';

/* Storage lives behind this narrow interface on purpose: the IndexedDB and
   Supabase-backed stores land later in the plan, and swapping them in should
   not touch a single component. */
export interface StateStore {
  load(): AppState;
  save(state: AppState): void;
}

export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'notes.state.v2';
/** The original vanilla app's key. Read once, never written, never deleted. */
export const LEGACY_KEY = 'notes.dashboard.v1';

export const POMO_LENGTHS: Record<'focus' | 'short' | 'long', number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

export const blankBoard = (name = 'Board'): Board => ({
  id: uid(),
  name,
  layout: 'grid',
  columns: [
    { id: uid(), name: 'To do' },
    { id: uid(), name: 'Doing' },
    { id: uid(), name: 'Done' },
  ],
  cards: [],
});

export const defaultState = (): AppState => {
  const b = blankBoard('My board');
  return {
    version: SCHEMA_VERSION,
    boards: [b],
    activeBoard: b.id,
    theme: 'light',
    calendarDays: {},
    pomodoro: {
      visible: false,
      mode: 'focus',
      remaining: POMO_LENGTHS.focus,
      running: false,
      completed: 0,
      x: null,
      y: null,
    },
  };
};

/* ---------------------------------------------------------- normalisation */

const CARD_TYPES: CardType[] = [
  'text', 'checklist', 'bulleted', 'numbered', 'link', 'image', 'table',
];
const LAYOUTS: Layout[] = ['canvas', 'grid', 'columns'];

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

/* Anything read back from storage is untrusted: it may predate a field, or
   have been hand-edited. Every card is rebuilt against its type's shape so a
   single malformed entry cannot take the whole app down at render time. */
function normaliseCard(raw: unknown, index: number, fallbackColumn: string): Card | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const type = CARD_TYPES.includes(r.type as CardType) ? (r.type as CardType) : null;
  if (!type) return null;

  const base = {
    id: str(r.id) || uid(),
    title: str(r.title),
    color: (str(r.color, 'default') || 'default') as Swatch,
    x: num(r.x, 40),
    y: num(r.y, 40),
    w: typeof r.w === 'number' ? r.w : null,
    order: num(r.order, index),
    columnId: str(r.columnId) || fallbackColumn,
  };

  const d = (r.data ?? {}) as Record<string, unknown>;
  const items = Array.isArray(d.items)
    ? d.items.map((i) => {
        const it = (i ?? {}) as Record<string, unknown>;
        return { id: str(it.id) || uid(), text: str(it.text), done: it.done === true };
      })
    : [{ id: uid(), text: '', done: false }];

  switch (type) {
    case 'text':
      return { ...base, type, data: { body: str(d.body) } };
    case 'checklist':
      return { ...base, type, data: { items } };
    case 'bulleted':
      return { ...base, type, data: { items } };
    case 'numbered':
      return { ...base, type, data: { items } };
    case 'link':
      return { ...base, type, data: { url: str(d.url), name: str(d.name) } };
    case 'image':
      return { ...base, type, data: { src: str(d.src), caption: str(d.caption) } };
    case 'table': {
      const rows = Array.isArray(d.rows) && d.rows.length
        ? (d.rows as unknown[]).map((row) =>
            Array.isArray(row) ? row.map((c) => str(c)) : ['']
          )
        : [['Column', 'Column'], ['', '']];
      return { ...base, type, data: { rows } };
    }
  }
}

function normaliseBoard(raw: unknown): Board | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const columns = Array.isArray(r.columns) && r.columns.length
    ? (r.columns as unknown[]).map((c) => {
        const col = (c ?? {}) as Record<string, unknown>;
        return { id: str(col.id) || uid(), name: str(col.name, 'Column') };
      })
    : blankBoard().columns;

  const cards = Array.isArray(r.cards)
    ? (r.cards as unknown[])
        .map((c, i) => normaliseCard(c, i, columns[0].id))
        .filter((c): c is Card => c !== null)
    : [];

  return {
    id: str(r.id) || uid(),
    name: str(r.name, 'Board'),
    layout: LAYOUTS.includes(r.layout as Layout) ? (r.layout as Layout) : 'grid',
    columns,
    cards,
  };
}

export function normaliseState(raw: unknown): AppState {
  const fresh = defaultState();
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Record<string, unknown>;

  const boards = Array.isArray(r.boards)
    ? (r.boards as unknown[]).map(normaliseBoard).filter((b): b is Board => b !== null)
    : [];
  if (!boards.length) return fresh;

  const days: AppState['calendarDays'] = {};
  if (r.calendarDays && typeof r.calendarDays === 'object') {
    for (const [key, value] of Object.entries(r.calendarDays as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Record<string, unknown>;
      const entry: { src?: string; text?: string } = {};
      if (typeof v.src === 'string' && v.src) entry.src = v.src;
      if (typeof v.text === 'string' && v.text) entry.text = v.text.slice(0, 50);
      if (entry.src || entry.text) days[key] = entry;
    }
  }

  const p = (r.pomodoro ?? {}) as Record<string, unknown>;
  const mode = (['focus', 'short', 'long'] as const).includes(p.mode as 'focus')
    ? (p.mode as 'focus' | 'short' | 'long')
    : 'focus';

  return {
    version: SCHEMA_VERSION,
    boards,
    activeBoard: boards.some((b) => b.id === r.activeBoard)
      ? str(r.activeBoard)
      : boards[0].id,
    theme: (r.theme === 'dark' ? 'dark' : 'light') as Theme,
    calendarDays: days,
    pomodoro: {
      visible: p.visible === true,
      mode,
      remaining: num(p.remaining, POMO_LENGTHS[mode]),
      // A timer that was running when the tab closed comes back paused, not
      // lying about elapsed time.
      running: false,
      completed: num(p.completed, 0),
      x: typeof p.x === 'number' ? p.x : null,
      y: typeof p.y === 'number' ? p.y : null,
    },
  };
}

/* ------------------------------------------------------------ local store */

const parse = (text: string | null): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export class LocalStorageStore implements StateStore {
  /** Surfaced to the UI so a full quota stops being a silent console warning. */
  onError: ((message: string) => void) | null = null;

  load(): AppState {
    try {
      const current = parse(localStorage.getItem(STORAGE_KEY));
      if (current) return normaliseState(current);

      // First run on the React app: adopt whatever the vanilla version saved.
      // The old key is left untouched, so it stays a usable backup.
      const legacy = parse(localStorage.getItem(LEGACY_KEY));
      if (legacy) {
        const migrated = normaliseState(legacy);
        this.save(migrated);
        return migrated;
      }
    } catch {
      // Storage can throw outright in private modes and with site data blocked.
    }
    return defaultState();
  }

  save(state: AppState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      // Most likely the quota: base64 images are the usual culprit. Images
      // move to object storage later in the plan, which retires this.
      console.warn('Could not save — storage may be full.', err);
      this.onError?.('Could not save your changes — browser storage is full.');
    }
  }
}

export const store = new LocalStorageStore();
