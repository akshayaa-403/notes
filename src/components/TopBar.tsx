import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../state/StoreContext';
import type { CardType, Layout } from '../types';
import { TYPE_META, TYPE_ORDER } from '../cards/registry';
import { BoardTabs } from './BoardTabs';
import { Menu } from './Menu';

const LAYOUTS: { key: Layout; label: string; title: string }[] = [
  { key: 'canvas', label: 'Canvas', title: 'Free canvas' },
  { key: 'grid', label: 'Grid', title: 'Masonry grid' },
  { key: 'columns', label: 'Columns', title: 'Columns' },
];

export function TopBar() {
  const { state, board, dispatch } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();
  const onCalendar = useLocation().pathname === '/calendar';

  const addCard = (cardType: CardType) => {
    setAddOpen(false);
    // Adding a card means you want the board, not the calendar, in front of you.
    if (onCalendar) navigate(`/b/${state.activeBoard}`);
    dispatch({ t: 'card/add', cardType });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="wordmark">Notes</span>
        <BoardTabs />
        <button
          className="icon-btn"
          title="New board"
          aria-label="New board"
          onClick={() => dispatch({ t: 'board/add' })}
        >
          +
        </button>
      </div>

      <div className="topbar-right">
        <div className="segmented" role="tablist" aria-label="Layout">
          {LAYOUTS.map((l) => (
            <button
              key={l.key}
              role="tab"
              title={l.title}
              aria-selected={!onCalendar && board.layout === l.key}
              className={!onCalendar && board.layout === l.key ? 'active' : undefined}
              onClick={() => {
                if (onCalendar) navigate(`/b/${state.activeBoard}`);
                dispatch({ t: 'board/layout', layout: l.key });
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <Menu
          open={addOpen}
          onOpenChange={setAddOpen}
          label="Add a card"
          trigger={
            <button className="btn primary" aria-haspopup="menu" aria-expanded={addOpen}>
              New
            </button>
          }
        >
          {TYPE_ORDER.map((type) => (
            <button key={type} role="menuitem" onClick={() => addCard(type)}>
              <span className="glyph">{TYPE_META[type].glyph}</span>
              <span>{TYPE_META[type].label}</span>
            </button>
          ))}
        </Menu>

        <button
          className={'icon-btn' + (onCalendar ? ' active' : '')}
          title="Calendar"
          aria-label="Calendar"
          aria-pressed={onCalendar}
          onClick={() => navigate(onCalendar ? `/b/${state.activeBoard}` : '/calendar')}
        >
          {'\u{1F4C5}'}
        </button>

        <button
          className="icon-btn"
          title="Pomodoro timer"
          aria-label="Pomodoro timer"
          aria-pressed={state.pomodoro.visible}
          onClick={() =>
            dispatch({ t: 'pomo', patch: { visible: !state.pomodoro.visible } })
          }
        >
          ⏱
        </button>

        <button
          className="icon-btn"
          title="Toggle theme"
          aria-label="Toggle theme"
          onClick={() =>
            dispatch({ t: 'theme', theme: state.theme === 'dark' ? 'light' : 'dark' })
          }
        >
          {state.theme === 'dark' ? '☼' : '☽'}
        </button>
      </div>
    </header>
  );
}
