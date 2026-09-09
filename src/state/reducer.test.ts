import { describe, expect, it } from 'vitest';
import { reducer, DAY_TEXT_MAX, type Action } from './reducer';
import { defaultState } from '../lib/storage';
import type { AppState } from '../types';

const run = (state: AppState, ...actions: Action[]) =>
  actions.reduce(reducer, state);

const withCard = () => {
  const s = reducer(defaultState(), { t: 'card/add', cardType: 'text' });
  return { state: s, card: s.boards[0].cards[0] };
};

describe('cards', () => {
  it('adds a card to the active board with staggered canvas placement', () => {
    const s = run(defaultState(),
      { t: 'card/add', cardType: 'text' },
      { t: 'card/add', cardType: 'checklist' }
    );
    const cards = s.boards[0].cards;
    expect(cards).toHaveLength(2);
    expect(cards[0].x).not.toBe(cards[1].x);
    expect(cards[1].order).toBe(1);
  });

  it('gives each type its own initial payload', () => {
    const s = run(defaultState(),
      { t: 'card/add', cardType: 'table' },
      { t: 'card/add', cardType: 'checklist' }
    );
    const [table, checklist] = s.boards[0].cards;
    expect(table.type === 'table' && table.data.rows).toHaveLength(2);
    expect(checklist.type === 'checklist' && checklist.data.items).toHaveLength(1);
  });

  it('duplicates a card with a new id, offset on the canvas', () => {
    const { state, card } = withCard();
    const s = reducer(state, { t: 'card/duplicate', id: card.id });
    const [original, copy] = s.boards[0].cards;
    expect(copy.id).not.toBe(original.id);
    expect(copy.x).toBe(original.x + 24);
  });

  it('reorders without losing cards the caller did not mention', () => {
    const s = run(defaultState(),
      { t: 'card/add', cardType: 'text' },
      { t: 'card/add', cardType: 'text' },
      { t: 'card/add', cardType: 'text' }
    );
    const [a, b, c] = s.boards[0].cards.map((x) => x.id);
    // A stale list, missing `c` entirely.
    const next = reducer(s, { t: 'card/reorder', ids: [c, a] });
    expect(next.boards[0].cards).toHaveLength(3);
    expect(next.boards[0].cards.map((x) => x.id)).toEqual([c, a, b]);
    expect(next.boards[0].cards.map((x) => x.order)).toEqual([0, 1, 2]);
  });
});

describe('columns', () => {
  it('reassigns orphaned cards instead of deleting them', () => {
    const { state, card } = withCard();
    const [first, second] = state.boards[0].columns;
    const s = run(state,
      { t: 'card/column', id: card.id, columnId: first.id },
      { t: 'column/delete', id: first.id }
    );
    expect(s.boards[0].cards).toHaveLength(1);
    expect(s.boards[0].cards[0].columnId).toBe(second.id);
  });

  it('refuses to delete the last column', () => {
    let s = defaultState();
    const ids = s.boards[0].columns.map((c) => c.id);
    s = run(s, { t: 'column/delete', id: ids[0] }, { t: 'column/delete', id: ids[1] });
    expect(s.boards[0].columns).toHaveLength(1);
    s = reducer(s, { t: 'column/delete', id: ids[2] });
    expect(s.boards[0].columns).toHaveLength(1);
  });
});

describe('boards', () => {
  it('refuses to delete the last board', () => {
    const s = defaultState();
    expect(reducer(s, { t: 'board/delete', id: s.activeBoard }).boards).toHaveLength(1);
  });

  it('moves the active board when the active one is deleted', () => {
    let s = reducer(defaultState(), { t: 'board/add' });
    const removed = s.activeBoard;
    s = reducer(s, { t: 'board/delete', id: removed });
    expect(s.boards).toHaveLength(1);
    expect(s.activeBoard).not.toBe(removed);
  });
});

describe('calendar days', () => {
  it('caps a note at the limit', () => {
    const s = reducer(defaultState(), {
      t: 'day/text',
      key: '2026-09-10',
      text: 'x'.repeat(80),
    });
    expect(s.calendarDays['2026-09-10'].text).toHaveLength(DAY_TEXT_MAX);
  });

  it('keeps a picture and a note side by side', () => {
    const s = run(defaultState(),
      { t: 'day/image', key: '2026-09-10', src: 'data:image/png;base64,AAA' },
      { t: 'day/text', key: '2026-09-10', text: 'Beach' }
    );
    expect(s.calendarDays['2026-09-10']).toEqual({
      src: 'data:image/png;base64,AAA',
      text: 'Beach',
    });
  });

  it('drops the day once it holds nothing', () => {
    const s = run(defaultState(),
      { t: 'day/image', key: '2026-09-10', src: 'data:image/png;base64,AAA' },
      { t: 'day/text', key: '2026-09-10', text: 'Beach' },
      { t: 'day/clearImage', key: '2026-09-10' },
      { t: 'day/text', key: '2026-09-10', text: '   ' }
    );
    expect(s.calendarDays).toEqual({});
  });
});
