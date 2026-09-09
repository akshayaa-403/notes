import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Card } from '../types';
import { SWATCHES } from '../types';
import { TYPE_META } from '../cards/registry';
import { useStore } from '../state/StoreContext';
import { CardBody } from './CardBody';
import { Menu } from './Menu';
import { dragState } from './dragState';

interface Props {
  card: Card;
  /** Canvas mode positions the card itself; the other layouts let flow do it. */
  floating?: boolean;
}

type DropEdge = 'before' | 'after' | null;

export function CardShell({ card, floating = false }: Props) {
  const { board, dispatch } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dropEdge, setDropEdge] = useState<DropEdge>(null);
  const [draggable, setDraggable] = useState(false);
  const node = useRef<HTMLDivElement>(null);

  /* Canvas mode: free positioning via pointer events, which unlike HTML5 drag
     works for mouse, touch and pen alike. */
  const onGripPointerDown = (e: ReactPointerEvent) => {
    if (!floating) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = card.x;
    const origY = card.y;
    let x = origX;
    let y = origY;

    const move = (ev: PointerEvent) => {
      x = Math.max(0, origX + (ev.clientX - startX));
      y = Math.max(0, origY + (ev.clientY - startY));
      // Painted straight onto the node during the drag; committing every frame
      // to the store would re-render the whole board on each pointermove.
      if (node.current) {
        node.current.style.left = `${x}px`;
        node.current.style.top = `${y}px`;
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      dispatch({ t: 'card/move', id: card.id, x, y });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onResizePointerDown = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const origW = node.current?.offsetWidth ?? 260;
    let w = origW;

    const move = (ev: PointerEvent) => {
      w = Math.max(180, origW + (ev.clientX - startX));
      if (node.current) node.current.style.width = `${w}px`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      dispatch({ t: 'card/resize', id: card.id, w });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  /* Grid and columns: reorder by dropping onto a sibling. */
  const onDrop = (e: React.DragEvent) => {
    const sourceId = dragState.id;
    setDropEdge(null);
    if (!sourceId || sourceId === card.id) return;
    e.preventDefault();
    e.stopPropagation();

    const r = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    const ids = board.cards
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id)
      .filter((id) => id !== sourceId);
    const idx = ids.indexOf(card.id);
    ids.splice(after ? idx + 1 : idx, 0, sourceId);

    dispatch({
      t: 'card/reorder',
      ids,
      // In columns mode the drop target's column wins, which is how a card
      // moves between columns.
      ...(board.layout === 'columns'
        ? { columnId: card.columnId, movedId: sourceId }
        : {}),
    });
  };

  const style: React.CSSProperties = {
    ['--card-bg' as string]: `var(--c-${card.color})`,
  };
  if (floating) {
    style.left = card.x;
    style.top = card.y;
    if (card.w) style.width = card.w;
  }

  return (
    <div
      ref={node}
      className={
        'card' +
        (dragging ? ' dragging' : '') +
        (dropEdge ? ` drop-${dropEdge}` : '')
      }
      style={style}
      data-id={card.id}
      draggable={draggable}
      onDragStart={(e) => {
        dragState.start(card.id);
        setDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.id);
      }}
      onDragEnd={() => {
        dragState.end();
        setDragging(false);
        setDraggable(false);
        setDropEdge(null);
      }}
      onDragOver={(e) => {
        if (!dragState.id || dragState.id === card.id) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        setDropEdge(e.clientY > r.top + r.height / 2 ? 'after' : 'before');
      }}
      onDragLeave={() => setDropEdge(null)}
      onDrop={onDrop}
    >
      <div className="card-head">
        <span
          className="card-grip"
          title="Drag"
          onPointerDown={onGripPointerDown}
          // The node only becomes draggable once the grip is pressed, so
          // selecting text inside the card does not start a drag.
          onMouseDown={() => { if (!floating) setDraggable(true); }}
        >
          ⁙
        </span>

        <input
          className="card-title"
          placeholder={TYPE_META[card.type].label}
          value={card.title}
          aria-label="Card title"
          onChange={(e) => dispatch({ t: 'card/title', id: card.id, title: e.target.value })}
        />

        <Menu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          trigger={
            <button
              className="icon-btn sm card-menu-btn"
              title="Options"
              aria-label="Card options"
              aria-haspopup="menu"
            >
              ⋯
            </button>
          }
        >
          <div className="menu-label">Colour</div>
          <div className="swatches">
            {SWATCHES.map((c) => (
              <button
                key={c}
                className={'swatch' + (card.color === c ? ' active' : '')}
                title={c}
                aria-label={c}
                style={{ background: `var(--c-${c})` }}
                onClick={() => {
                  dispatch({ t: 'card/color', id: card.id, color: c });
                  setMenuOpen(false);
                }}
              />
            ))}
          </div>
          <hr />

          {board.layout === 'columns' && (
            <>
              <div className="menu-label">Move to</div>
              {board.columns.map((col) => (
                <button
                  key={col.id}
                  role="menuitem"
                  onClick={() => {
                    dispatch({ t: 'card/column', id: card.id, columnId: col.id });
                    setMenuOpen(false);
                  }}
                >
                  <span className="glyph">{card.columnId === col.id ? '✓' : ''}</span>
                  <span>{col.name}</span>
                </button>
              ))}
              <hr />
            </>
          )}

          <button
            role="menuitem"
            onClick={() => {
              dispatch({ t: 'card/duplicate', id: card.id });
              setMenuOpen(false);
            }}
          >
            <span className="glyph">⧉</span>
            <span>Duplicate</span>
          </button>
          <button
            role="menuitem"
            onClick={() => {
              dispatch({ t: 'card/delete', id: card.id });
              setMenuOpen(false);
            }}
          >
            <span className="glyph">⌦</span>
            <span>Delete</span>
          </button>
        </Menu>
      </div>

      <div className="card-body">
        <CardBody card={card} />
      </div>

      {floating && (
        <div className="resize-handle" title="Resize" onPointerDown={onResizePointerDown} />
      )}
    </div>
  );
}
