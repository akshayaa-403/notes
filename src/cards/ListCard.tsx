import { useEffect, useRef } from 'react';
import type { Card, ListItem } from '../types';
import { useStore } from '../state/StoreContext';
import { uid } from '../lib/uid';
import { Autosize } from '../components/Autosize';

type ListCardType = Extract<Card, { type: 'checklist' | 'bulleted' | 'numbered' }>;

interface Props {
  card: ListCardType;
  kind: 'check' | 'bullet' | 'number';
}

/** Shared renderer for the three list-ish types. */
export function ListCard({ card, kind }: Props) {
  const { dispatch } = useStore();
  const items = card.data.items;

  /* Which row to focus after the next render. Adding or removing a row
     re-renders the list, so focus has to be re-applied rather than kept. */
  const focusRow = useRef<number | null>(null);
  const rows = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    const i = focusRow.current;
    if (i === null) return;
    focusRow.current = null;
    rows.current[i]?.focus();
  }, [items.length]);

  const commit = (next: ListItem[], focus?: number) => {
    if (focus !== undefined) focusRow.current = focus;
    dispatch({ t: 'card/data', id: card.id, data: { items: next } });
  };

  const newItem = (): ListItem =>
    kind === 'check' ? { id: uid(), text: '', done: false } : { id: uid(), text: '' };

  const replace = (i: number, patch: Partial<ListItem>) =>
    commit(items.map((it, n) => (n === i ? { ...it, ...patch } : it)));

  return (
    <>
      <div className="list">
        {items.map((item, i) => (
          <div key={item.id} className={'list-row' + (item.done ? ' done' : '')}>
            {kind === 'check' ? (
              <input
                type="checkbox"
                checked={!!item.done}
                aria-label={item.text || 'List item'}
                onChange={(e) => replace(i, { done: e.target.checked })}
              />
            ) : (
              <span className="bullet">{kind === 'number' ? `${i + 1}.` : '•'}</span>
            )}

            <Autosize
              ref={(node: HTMLTextAreaElement | null) => { rows.current[i] = node; }}
              className="field"
              placeholder="List item"
              value={item.text}
              aria-label="List item"
              onChange={(e) => replace(i, { text: e.target.value })}
              onKeyDown={(e) => {
                // Enter adds the next item; Backspace on an empty row removes it.
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const next = items.slice();
                  next.splice(i + 1, 0, newItem());
                  commit(next, i + 1);
                } else if (e.key === 'Backspace' && item.text === '' && items.length > 1) {
                  e.preventDefault();
                  commit(items.filter((_, n) => n !== i), Math.max(0, i - 1));
                }
              }}
            />

            <button
              className="del"
              title="Delete item"
              aria-label="Delete item"
              onClick={() => {
                const next = items.filter((_, n) => n !== i);
                // A list always keeps one row, so there is somewhere to type.
                commit(next.length ? next : [newItem()]);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        className="add-row"
        onClick={() => commit([...items, newItem()], items.length)}
      >
        + Add item
      </button>
    </>
  );
}
