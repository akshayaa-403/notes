import { beforeEach, describe, expect, it } from 'vitest';
import { LEGACY_KEY, LocalStorageStore, STORAGE_KEY, normaliseState } from './storage';

describe('normaliseState', () => {
  it('falls back to a fresh state for junk', () => {
    expect(normaliseState(null).boards).toHaveLength(1);
    expect(normaliseState('nonsense').boards).toHaveLength(1);
    expect(normaliseState({ boards: [] }).boards).toHaveLength(1);
  });

  it('drops cards of an unknown type rather than rendering them', () => {
    const s = normaliseState({
      boards: [{ id: 'b', name: 'B', layout: 'grid', columns: [{ id: 'c', name: 'C' }], cards: [
        { id: '1', type: 'text', data: { body: 'keep' } },
        { id: '2', type: 'wormhole', data: {} },
      ] }],
      activeBoard: 'b',
    });
    expect(s.boards[0].cards).toHaveLength(1);
    expect(s.boards[0].cards[0].id).toBe('1');
  });

  it('repairs a card whose payload is missing fields', () => {
    const s = normaliseState({
      boards: [{ id: 'b', name: 'B', columns: [{ id: 'c', name: 'C' }], cards: [
        { id: '1', type: 'table' },
      ] }],
      activeBoard: 'b',
    });
    const card = s.boards[0].cards[0];
    expect(card.type === 'table' && card.data.rows.length).toBeGreaterThan(0);
    expect(card.columnId).toBe('c');
  });

  it('never restores a running timer', () => {
    const s = normaliseState({
      boards: [{ id: 'b', name: 'B', cards: [] }],
      activeBoard: 'b',
      pomodoro: { running: true, remaining: 120, mode: 'focus' },
    });
    expect(s.pomodoro.running).toBe(false);
    expect(s.pomodoro.remaining).toBe(120);
  });

  it('points activeBoard at a board that exists', () => {
    const s = normaliseState({
      boards: [{ id: 'b', name: 'B', cards: [] }],
      activeBoard: 'gone',
    });
    expect(s.activeBoard).toBe('b');
  });
});

describe('LocalStorageStore', () => {
  beforeEach(() => localStorage.clear());

  it('adopts data from the vanilla app on first run, without destroying it', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      boards: [{ id: 'old', name: 'Old board', layout: 'canvas', columns: [{ id: 'c', name: 'C' }], cards: [
        { id: '1', type: 'text', title: 'Kept', data: { body: 'hello' } },
      ] }],
      activeBoard: 'old',
      calendarDays: { '2026-09-10': { text: 'note' } },
    }));

    const loaded = new LocalStorageStore().load();
    expect(loaded.boards[0].name).toBe('Old board');
    expect(loaded.boards[0].cards[0].title).toBe('Kept');
    expect(loaded.calendarDays['2026-09-10'].text).toBe('note');

    // Written forward, and the original left in place as a backup.
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
  });

  it('prefers its own key once one exists', () => {
    const store = new LocalStorageStore();
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      boards: [{ id: 'old', name: 'Legacy', cards: [] }], activeBoard: 'old',
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      boards: [{ id: 'new', name: 'Current', cards: [] }], activeBoard: 'new',
    }));
    expect(store.load().boards[0].name).toBe('Current');
  });

  it('reports a failed write instead of only logging it', () => {
    const store = new LocalStorageStore();
    const reported: string[] = [];
    store.onError = (m) => reported.push(m);

    // Spied on the prototype: localStorage itself is a proxy in jsdom, so
    // assigning to its setItem does not take effect.
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => { throw new Error('QuotaExceededError'); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      store.save(defaultState());
    } finally {
      setItem.mockRestore();
      warn.mockRestore();
    }
    expect(reported).toHaveLength(1);
    expect(reported[0]).toMatch(/storage is full/i);
  });
});
