import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/StoreContext';

export function BoardTabs() {
  const { state, dispatch } = useStore();
  const [renaming, setRenaming] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="board-tabs" role="tablist" aria-label="Boards">
      {state.boards.map((b) =>
        renaming === b.id ? (
          <input
            key={b.id}
            className="board-tab-input"
            defaultValue={b.name}
            autoFocus
            aria-label={`Rename ${b.name}`}
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name) dispatch({ t: 'board/rename', id: b.id, name });
              setRenaming(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                // Restore the old name first, so blur has nothing to commit.
                e.currentTarget.value = b.name;
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <button
            key={b.id}
            role="tab"
            aria-selected={b.id === state.activeBoard}
            className={'board-tab' + (b.id === state.activeBoard ? ' active' : '')}
            title="Click to open, double-click to rename"
            onClick={() => navigate(`/b/${b.id}`)}
            onDoubleClick={() => setRenaming(b.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (state.boards.length <= 1) return;
              // Kept as a native confirm until undo/redo lands, since deleting
              // a board takes all its cards with it.
              if (confirm(`Delete board "${b.name}" and all its cards?`)) {
                dispatch({ t: 'board/delete', id: b.id });
              }
            }}
          >
            {b.name}
          </button>
        )
      )}
    </div>
  );
}
