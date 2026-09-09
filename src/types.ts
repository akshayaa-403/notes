/* The shapes that were implicit in the original app.js. Typing the per-type
   `data` payload is the main win here: a card's type and its data can no
   longer drift apart. */

export type Layout = 'canvas' | 'grid' | 'columns';

export type Swatch =
  | 'default' | 'gray' | 'brown' | 'orange' | 'yellow'
  | 'green' | 'blue' | 'purple' | 'pink' | 'red';

export const SWATCHES: Swatch[] = [
  'default', 'gray', 'brown', 'orange', 'yellow',
  'green', 'blue', 'purple', 'pink', 'red',
];

/* ---------------------------------------------------------- card payloads */

export interface ListItem {
  id: string;
  text: string;
  done?: boolean;
}

export interface CardDataMap {
  text: { body: string };
  checklist: { items: ListItem[] };
  bulleted: { items: ListItem[] };
  numbered: { items: ListItem[] };
  link: { url: string; name: string };
  image: { src: string; caption: string };
  table: { rows: string[][] };
}

export type CardType = keyof CardDataMap;

/* A card is a union over its type, so narrowing on `card.type` narrows
   `card.data` with it. */
export type Card = {
  [K in CardType]: {
    id: string;
    type: K;
    data: CardDataMap[K];
    title: string;
    color: Swatch;
    /* Canvas position and width. Every card carries all three layouts at
       once, so switching modes never destroys another mode's arrangement. */
    x: number;
    y: number;
    w: number | null;
    order: number;
    columnId: string;
  };
}[CardType];

export interface Column {
  id: string;
  name: string;
}

export interface Board {
  id: string;
  name: string;
  layout: Layout;
  columns: Column[];
  cards: Card[];
}

/* ------------------------------------------------------------- calendar */

/** Keyed by ISO date, e.g. `2026-09-10`. */
export interface DayEntry {
  src?: string;
  text?: string;
}

export type CalendarDays = Record<string, DayEntry>;

/* --------------------------------------------------------------- pomodoro */

export type PomoMode = 'focus' | 'short' | 'long';

export interface PomodoroState {
  visible: boolean;
  mode: PomoMode;
  remaining: number;
  running: boolean;
  completed: number;
  x: number | null;
  y: number | null;
}

/* ------------------------------------------------------------------ state */

export type Theme = 'light' | 'dark';

export interface AppState {
  /** Bumped when a migration is needed; see lib/storage.ts. */
  version: number;
  boards: Board[];
  activeBoard: string;
  theme: Theme;
  calendarDays: CalendarDays;
  pomodoro: PomodoroState;
}
