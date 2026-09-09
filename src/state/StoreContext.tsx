import {
  createContext, useContext, useEffect, useMemo, useReducer, useRef, useState,
  type ReactNode,
} from 'react';
import type { AppState, Board } from '../types';
import { reducer, type Action } from './reducer';
import { store } from '../lib/storage';

interface StoreValue {
  state: AppState;
  dispatch: (a: Action) => void;
  board: Board;
  /** Set when persistence fails, e.g. a full storage quota. */
  error: string | null;
  clearError: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Writes are batched: dragging a card fires a burst of moves, and each one
 *  would otherwise re-serialise the entire state. */
const SAVE_DEBOUNCE_MS = 400;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => store.load());
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(state);

  latest.current = state;

  useEffect(() => {
    store.onError = setError;
    return () => { store.onError = null; };
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => store.save(state), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [state]);

  // A debounced write would otherwise be lost if the tab closes mid-window.
  useEffect(() => {
    const flush = () => {
      clearTimeout(timer.current);
      store.save(latest.current);
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const board = useMemo(
    () => state.boards.find((b) => b.id === state.activeBoard) ?? state.boards[0],
    [state.boards, state.activeBoard]
  );

  const value = useMemo<StoreValue>(
    () => ({ state, dispatch, board, error, clearError: () => setError(null) }),
    [state, board, error]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside a StoreProvider');
  return ctx;
}
