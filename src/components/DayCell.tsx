import { useState } from 'react';
import type { DayEntry } from '../types';
import type { MonthCell } from '../lib/date';
import { DAY_TEXT_MAX } from '../state/reducer';

interface Props {
  cell: MonthCell;
  entry: DayEntry | undefined;
  editing: boolean;
  onSingleClick: (key: string) => void;
  onDoubleClick: (key: string) => void;
  onCommitText: (key: string, text: string) => void;
  onCancelEdit: () => void;
  onClearImage: (key: string) => void;
  onOverflow: () => void;
}

export function DayCell({
  cell, entry, editing,
  onSingleClick, onDoubleClick, onCommitText, onCancelEdit, onClearImage, onOverflow,
}: Props) {
  const { day, key, isToday } = cell;

  // Adjacent-month days exist only to keep the weeks aligned.
  if (!key) {
    return (
      <div className="cal-day pad" role="gridcell" aria-hidden="true">
        <span className="cal-num">{day}</span>
      </div>
    );
  }

  return (
    <div
      className={'cal-day' + (isToday ? ' today' : '')}
      role="gridcell"
      data-date={key}
      title="Click to add a picture, double-click to add a note"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.cal-img-x, .cal-text-input')) return;
        onSingleClick(key);
      }}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('.cal-img-x')) return;
        onDoubleClick(key);
      }}
    >
      <span className="cal-num">{day}</span>

      {entry?.src && (
        <>
          <img className="cal-img" src={entry.src} alt={entry.text ?? ''} />
          <button
            className="cal-img-x"
            title="Remove picture"
            aria-label={`Remove picture from ${key}`}
            onClick={(e) => {
              e.stopPropagation();
              onClearImage(key);
            }}
          >
            ×
          </button>
        </>
      )}

      {editing ? (
        <NoteInput
          initial={entry?.text ?? ''}
          onCommit={(text) => onCommitText(key, text)}
          onCancel={onCancelEdit}
          onOverflow={onOverflow}
        />
      ) : (
        entry?.text && <span className="cal-text">{entry.text}</span>
      )}
    </div>
  );
}

interface NoteProps {
  initial: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
  onOverflow: () => void;
}

/* The 50-character cap is enforced here rather than with maxlength, so that
   overtyping can be explained instead of silently ignored. */
function NoteInput({ initial, onCommit, onCancel, onOverflow }: NoteProps) {
  const [value, setValue] = useState(initial);
  const [atLimit, setAtLimit] = useState(false);

  const overflow = () => {
    setAtLimit(true);
    onOverflow();
  };

  return (
    <input
      className={'cal-text-input' + (atLimit ? ' at-limit' : '')}
      type="text"
      placeholder="Add a note…"
      aria-label="Day note"
      value={value}
      autoFocus
      onClick={(e) => e.stopPropagation()}
      // Catches paste and drag-drop, which arrive as a value change rather
      // than as keystrokes.
      onChange={(e) => {
        const next = e.target.value;
        if (next.length > DAY_TEXT_MAX) {
          setValue(next.slice(0, DAY_TEXT_MAX));
          overflow();
        } else {
          setValue(next);
          setAtLimit(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit(value);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
          return;
        }
        const typing = e.key.length === 1 && !e.ctrlKey && !e.metaKey;
        const target = e.currentTarget;
        const replacing = target.selectionStart !== target.selectionEnd;
        if (typing && !replacing && value.length >= DAY_TEXT_MAX) {
          e.preventDefault();
          overflow();
        }
      }}
      onBlur={() => onCommit(value)}
    />
  );
}
