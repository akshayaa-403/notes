import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/StoreContext';
import { DOW, monthGrid, monthLabel, weeksIn } from '../lib/date';
import { DAY_IMAGE_MAX, readImageFile } from '../lib/image';
import { DAY_TEXT_MAX } from '../state/reducer';
import { DayCell } from './DayCell';
import { Toast } from './Toast';

/** How long a single click waits to see whether it is half of a double click.
 *  A desktop idiom; the mobile step replaces it with an explicit day sheet. */
const DOUBLE_CLICK_MS = 260;

export function CalendarView() {
  const { state, dispatch } = useStore();
  const [view, setView] = useState(() => new Date());
  const [editing, setEditing] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const navigate = useNavigate();

  const clickTimer = useRef<number | undefined>(undefined);
  const picker = useRef<HTMLInputElement>(null);
  const pickingFor = useRef<string | null>(null);

  const cells = useMemo(
    () => monthGrid(view.getFullYear(), view.getMonth()),
    [view]
  );

  const go = (delta: number) =>
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  const pickImage = (key: string) => {
    pickingFor.current = key;
    picker.current?.click();
  };

  return (
    <section className="calendar-view" aria-label="Calendar">
      <div className="cal-bar">
        <button className="icon-btn" onClick={() => go(-1)} title="Previous month" aria-label="Previous month">
          ‹
        </button>
        <h2 className="cal-month">{monthLabel(view)}</h2>
        <button className="icon-btn" onClick={() => go(1)} title="Next month" aria-label="Next month">
          ›
        </button>
        <button className="btn" onClick={() => setView(new Date())}>
          Today
        </button>
        <span className="cal-spacer" />
        <button
          className="icon-btn"
          title="Back to board"
          aria-label="Back to board"
          onClick={() => navigate(`/b/${state.activeBoard}`)}
        >
          ×
        </button>
      </div>

      {/* Rows come from the week count so the month always fills the space. */}
      <div
        className="cal-grid"
        role="grid"
        style={{ gridTemplateRows: `auto repeat(${weeksIn(cells)}, minmax(0, 1fr))` }}
      >
        {DOW.map((d, i) => (
          <div className="cal-dow" role="columnheader" key={i}>
            {d}
          </div>
        ))}

        {cells.map((cell, i) => (
          <DayCell
            key={cell.key ?? `pad-${i}`}
            cell={cell}
            entry={cell.key ? state.calendarDays[cell.key] : undefined}
            editing={editing !== null && editing === cell.key}
            onSingleClick={(key) => {
              clearTimeout(clickTimer.current);
              clickTimer.current = window.setTimeout(() => pickImage(key), DOUBLE_CLICK_MS);
            }}
            onDoubleClick={(key) => {
              clearTimeout(clickTimer.current);
              setEditing(key);
            }}
            onCommitText={(key, text) => {
              setEditing(null);
              dispatch({ t: 'day/text', key, text });
            }}
            onCancelEdit={() => setEditing(null)}
            onClearImage={(key) => dispatch({ t: 'day/clearImage', key })}
            onOverflow={() =>
              setWarning(`That is the ${DAY_TEXT_MAX}-character limit for a day note.`)
            }
          />
        ))}
      </div>

      <input
        ref={picker}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const key = pickingFor.current;
          const file = e.target.files?.[0] ?? null;
          // Cleared so picking the same file twice still fires a change.
          e.target.value = '';
          if (!key) return;
          const src = await readImageFile(file, DAY_IMAGE_MAX);
          if (src) dispatch({ t: 'day/image', key, src });
        }}
      />

      {warning && (
        <Toast message={warning} timeout={2600} onDismiss={() => setWarning(null)} />
      )}
    </section>
  );
}
