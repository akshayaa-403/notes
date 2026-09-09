import type {
  AppState, Board, Card, CardType, Layout, PomodoroState, Swatch, Theme,
} from '../types';
import { blankBoard } from '../lib/storage';
import { emptyData } from '../cards/registry';
import { uid } from '../lib/uid';

export type Action =
  /* boards */
  | { t: 'board/add' }
  | { t: 'board/rename'; id: string; name: string }
  | { t: 'board/delete'; id: string }
  | { t: 'board/activate'; id: string }
  | { t: 'board/layout'; layout: Layout }
  /* columns */
  | { t: 'column/add' }
  | { t: 'column/rename'; id: string; name: string }
  | { t: 'column/delete'; id: string }
  /* cards */
  | { t: 'card/add'; cardType: CardType; columnId?: string }
  | { t: 'card/title'; id: string; title: string }
  | { t: 'card/color'; id: string; color: Swatch }
  | { t: 'card/data'; id: string; data: Card['data'] }
  | { t: 'card/move'; id: string; x: number; y: number }
  | { t: 'card/resize'; id: string; w: number }
  | { t: 'card/duplicate'; id: string }
  | { t: 'card/delete'; id: string }
  /** Full ordering after a drag, plus an optional column reassignment. */
  | { t: 'card/reorder'; ids: string[]; columnId?: string; movedId?: string }
  | { t: 'card/column'; id: string; columnId: string }
  /* calendar */
  | { t: 'day/image'; key: string; src: string }
  | { t: 'day/text'; key: string; text: string }
  | { t: 'day/clearImage'; key: string }
  /* chrome */
  | { t: 'theme'; theme: Theme }
  | { t: 'pomo'; patch: Partial<PomodoroState> }
  /** Wholesale replacement, for import and for the sync layer later on. */
  | { t: 'state/replace'; state: AppState };

const activeBoard = (s: AppState): Board =>
  s.boards.find((b) => b.id === s.activeBoard) ?? s.boards[0];

/** Applies `fn` to the active board, leaving every other board identical. */
const mapActive = (s: AppState, fn: (b: Board) => Board): AppState => {
  const target = activeBoard(s);
  return { ...s, boards: s.boards.map((b) => (b.id === target.id ? fn(b) : b)) };
};

const mapCards = (s: AppState, fn: (cards: Card[]) => Card[]): AppState =>
  mapActive(s, (b) => ({ ...b, cards: fn(b.cards) }));

const patchCard = (s: AppState, id: string, patch: Partial<Card>): AppState =>
  mapCards(s, (cards) =>
    cards.map((c) => (c.id === id ? ({ ...c, ...patch } as Card) : c))
  );

/** Drops a day entry once it holds neither a picture nor a note. */
const pruneDay = (s: AppState, key: string): AppState => {
  const entry = s.calendarDays[key];
  if (entry && (entry.src || entry.text)) return s;
  const days = { ...s.calendarDays };
  delete days[key];
  return { ...s, calendarDays: days };
};

export const DAY_TEXT_MAX = 50;

export function reducer(state: AppState, action: Action): AppState {
  switch (action.t) {
    /* ------------------------------------------------------------ boards */
    case 'board/add': {
      const b = blankBoard(`Board ${state.boards.length + 1}`);
      return { ...state, boards: [...state.boards, b], activeBoard: b.id };
    }
    case 'board/rename':
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.id ? { ...b, name: action.name } : b
        ),
      };
    case 'board/delete': {
      // The last board is never removed; an app with no board has no state to
      // show and every layout would need an extra empty case.
      if (state.boards.length <= 1) return state;
      const boards = state.boards.filter((b) => b.id !== action.id);
      return {
        ...state,
        boards,
        activeBoard:
          state.activeBoard === action.id ? boards[0].id : state.activeBoard,
      };
    }
    case 'board/activate':
      return state.boards.some((b) => b.id === action.id)
        ? { ...state, activeBoard: action.id }
        : state;
    case 'board/layout':
      return mapActive(state, (b) => ({ ...b, layout: action.layout }));

    /* ----------------------------------------------------------- columns */
    case 'column/add':
      return mapActive(state, (b) => ({
        ...b,
        columns: [...b.columns, { id: uid(), name: 'New column' }],
      }));
    case 'column/rename':
      return mapActive(state, (b) => ({
        ...b,
        columns: b.columns.map((c) =>
          c.id === action.id ? { ...c, name: action.name } : c
        ),
      }));
    case 'column/delete':
      return mapActive(state, (b) => {
        if (b.columns.length <= 1) return b;
        const fallback = b.columns.find((c) => c.id !== action.id)!.id;
        return {
          ...b,
          columns: b.columns.filter((c) => c.id !== action.id),
          // Cards outlive their column: they fall back rather than vanish.
          cards: b.cards.map((c) =>
            c.columnId === action.id ? ({ ...c, columnId: fallback } as Card) : c
          ),
        };
      });

    /* ------------------------------------------------------------- cards */
    case 'card/add':
      return mapActive(state, (b) => {
        const n = b.cards.length;
        const card = {
          id: uid(),
          type: action.cardType,
          data: emptyData(action.cardType),
          title: '',
          color: 'default',
          // Stagger new canvas cards so they do not stack exactly on top of
          // each other.
          x: 40 + (n % 6) * 40,
          y: 40 + (n % 5) * 36,
          w: null,
          order: n,
          columnId: action.columnId ?? b.columns[0]?.id ?? '',
        } as Card;
        return { ...b, cards: [...b.cards, card] };
      });
    case 'card/title':
      return patchCard(state, action.id, { title: action.title });
    case 'card/color':
      return patchCard(state, action.id, { color: action.color });
    case 'card/data':
      return mapCards(state, (cards) =>
        cards.map((c) => (c.id === action.id ? ({ ...c, data: action.data } as Card) : c))
      );
    case 'card/move':
      return patchCard(state, action.id, { x: action.x, y: action.y });
    case 'card/resize':
      return patchCard(state, action.id, { w: action.w });
    case 'card/duplicate':
      return mapCards(state, (cards) => {
        const src = cards.find((c) => c.id === action.id);
        if (!src) return cards;
        const copy = {
          ...structuredClone(src),
          id: uid(),
          x: src.x + 24,
          y: src.y + 24,
          order: cards.length,
        } as Card;
        return [...cards, copy];
      });
    case 'card/delete':
      return mapCards(state, (cards) => cards.filter((c) => c.id !== action.id));
    case 'card/reorder':
      return mapCards(state, (cards) => {
        const byId = new Map(cards.map((c) => [c.id, c]));
        const ordered = action.ids
          .map((id) => byId.get(id))
          .filter((c): c is Card => c !== undefined);
        // Anything the caller did not mention keeps its place at the end,
        // so a stale id list can never drop a card.
        const rest = cards.filter((c) => !action.ids.includes(c.id));
        return [...ordered, ...rest].map((c, i) => {
          const moved =
            action.columnId && action.movedId === c.id
              ? { columnId: action.columnId }
              : null;
          return { ...c, ...moved, order: i } as Card;
        });
      });
    case 'card/column':
      return patchCard(state, action.id, { columnId: action.columnId });

    /* ---------------------------------------------------------- calendar */
    case 'day/image':
      return {
        ...state,
        calendarDays: {
          ...state.calendarDays,
          [action.key]: { ...state.calendarDays[action.key], src: action.src },
        },
      };
    case 'day/text': {
      const text = action.text.trim().slice(0, DAY_TEXT_MAX);
      const entry = { ...state.calendarDays[action.key] };
      if (text) entry.text = text;
      else delete entry.text;
      return pruneDay(
        { ...state, calendarDays: { ...state.calendarDays, [action.key]: entry } },
        action.key
      );
    }
    case 'day/clearImage': {
      const entry = { ...state.calendarDays[action.key] };
      delete entry.src;
      return pruneDay(
        { ...state, calendarDays: { ...state.calendarDays, [action.key]: entry } },
        action.key
      );
    }

    /* ------------------------------------------------------------ chrome */
    case 'theme':
      return { ...state, theme: action.theme };
    case 'pomo':
      return { ...state, pomodoro: { ...state.pomodoro, ...action.patch } };
    case 'state/replace':
      return action.state;
  }
}
