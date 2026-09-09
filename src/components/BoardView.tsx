import { useMemo, useState } from 'react';
import { useStore } from '../state/StoreContext';
import type { Card } from '../types';
import { CardShell } from './CardShell';
import { dragState } from './dragState';

export function BoardView() {
  const { board } = useStore();
  const sorted = useMemo(
    () => board.cards.slice().sort((a, b) => a.order - b.order),
    [board.cards]
  );

  if (!board.cards.length && board.layout !== 'columns') {
    return (
      <main className={'board ' + board.layout}>
        <EmptyState />
      </main>
    );
  }

  return (
    <main className={'board ' + board.layout}>
      {board.layout === 'canvas' && (
        <div className="canvas-plane">
          {sorted.map((card) => (
            <CardShell key={card.id} card={card} floating />
          ))}
        </div>
      )}

      {board.layout === 'grid' &&
        sorted.map((card) => <CardShell key={card.id} card={card} />)}

      {board.layout === 'columns' && <Columns cards={sorted} />}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <p>Nothing here yet.</p>
      <p className="muted">
        Hit <strong>New</strong> to add your first card.
      </p>
    </div>
  );
}

function Columns({ cards }: { cards: Card[] }) {
  const { board, dispatch } = useStore();

  return (
    <>
      {board.columns.map((col) => {
        const inCol = cards.filter((c) => c.columnId === col.id);
        return (
          <div className="column" key={col.id}>
            <div className="column-head">
              <input
                className="column-title"
                value={col.name}
                aria-label="Column name"
                onChange={(e) =>
                  dispatch({ t: 'column/rename', id: col.id, name: e.target.value })
                }
              />
              <span className="column-count">{inCol.length}</span>
              <button
                className="icon-btn sm"
                title="Delete column"
                aria-label={`Delete column ${col.name}`}
                disabled={board.columns.length <= 1}
                onClick={() => dispatch({ t: 'column/delete', id: col.id })}
              >
                ×
              </button>
            </div>
            <ColumnBody columnId={col.id} cards={inCol} />
          </div>
        );
      })}

      <button className="add-column" onClick={() => dispatch({ t: 'column/add' })}>
        + Add column
      </button>
    </>
  );
}

function ColumnBody({ columnId, cards }: { columnId: string; cards: Card[] }) {
  const { board, dispatch } = useStore();
  const [hint, setHint] = useState(false);

  return (
    <div
      className={'column-body' + (hint ? ' drop-hint' : '')}
      onDragOver={(e) => {
        if (!dragState.id) return;
        e.preventDefault();
        setHint(true);
      }}
      onDragLeave={() => setHint(false)}
      // Dropping onto empty space in a column moves the card to its end.
      onDrop={(e) => {
        const sourceId = dragState.id;
        setHint(false);
        if (!sourceId) return;
        e.preventDefault();
        const ids = board.cards
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((c) => c.id)
          .filter((id) => id !== sourceId);
        ids.push(sourceId);
        dispatch({ t: 'card/reorder', ids, columnId, movedId: sourceId });
      }}
    >
      {cards.map((card) => (
        <CardShell key={card.id} card={card} />
      ))}
    </div>
  );
}
