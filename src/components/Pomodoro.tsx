import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useStore } from '../state/StoreContext';
import { POMO_LENGTHS } from '../lib/storage';
import type { PomoMode } from '../types';

const MODES: { key: PomoMode; label: string }[] = [
  { key: 'focus', label: 'Focus' },
  { key: 'short', label: 'Short' },
  { key: 'long', label: 'Long' },
];

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
    osc.start();
    osc.stop(ctx.currentTime + 1.1);
  } catch {
    // Audio is a nicety, never a failure.
  }
}

export function Pomodoro() {
  const { state, dispatch } = useStore();
  const p = state.pomodoro;
  const panel = useRef<HTMLElement>(null);

  /* Driven off a wall-clock deadline rather than by counting ticks, because a
     background tab throttles timers and setInterval drifts. */
  const deadline = useRef<number | null>(null);

  useEffect(() => {
    if (!p.running) {
      deadline.current = null;
      return;
    }
    deadline.current = Date.now() + p.remaining * 1000;

    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((deadline.current! - Date.now()) / 1000));
      if (left > 0) {
        dispatch({ t: 'pomo', patch: { remaining: left } });
        return;
      }
      // Sits at 00:00 until the next mode is chosen, so a finished session
      // stays visible.
      dispatch({
        t: 'pomo',
        patch: {
          remaining: 0,
          running: false,
          completed: p.mode === 'focus' ? p.completed + 1 : p.completed,
        },
      });
      beep();
    }, 250);

    return () => clearInterval(id);
    // Restarted only when the run state or mode changes; `remaining` is read
    // once to set the deadline and must not re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.running, p.mode]);

  useEffect(() => {
    document.title = p.running ? `${fmt(p.remaining)} · Notes` : 'Notes';
  }, [p.running, p.remaining]);

  if (!p.visible) return null;

  const onDragHead = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const node = panel.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    const offX = e.clientX - r.left;
    const offY = e.clientY - r.top;
    let x = r.left;
    let y = r.top;

    const move = (ev: PointerEvent) => {
      x = Math.min(Math.max(0, ev.clientX - offX), window.innerWidth - r.width);
      y = Math.min(Math.max(0, ev.clientY - offY), window.innerHeight - r.height);
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.style.right = 'auto';
      node.style.bottom = 'auto';
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      dispatch({ t: 'pomo', patch: { x, y } });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const placement =
    p.x !== null && p.y !== null
      ? { left: p.x, top: p.y, right: 'auto' as const, bottom: 'auto' as const }
      : undefined;

  return (
    <section className="pomodoro" ref={panel} style={placement} aria-label="Pomodoro timer">
      <div className="pomo-head" onPointerDown={onDragHead}>
        <span className="pomo-title">Pomodoro</span>
        <button
          className="icon-btn sm"
          title="Hide"
          aria-label="Hide timer"
          onClick={() => dispatch({ t: 'pomo', patch: { visible: false } })}
        >
          ×
        </button>
      </div>

      <div className="pomo-modes">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={p.mode === m.key ? 'active' : undefined}
            aria-pressed={p.mode === m.key}
            onClick={() =>
              dispatch({
                t: 'pomo',
                patch: { mode: m.key, remaining: POMO_LENGTHS[m.key], running: false },
              })
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className={'pomo-time' + (p.running ? ' running' : '')} aria-live="off">
        {fmt(Math.max(0, p.remaining))}
      </div>

      <div className="pomo-actions">
        <button
          className="btn primary"
          onClick={() =>
            dispatch({
              t: 'pomo',
              patch: p.running
                ? { running: false }
                : {
                    running: true,
                    remaining: p.remaining > 0 ? p.remaining : POMO_LENGTHS[p.mode],
                  },
            })
          }
        >
          {p.running ? 'Pause' : 'Start'}
        </button>
        <button
          className="btn"
          onClick={() =>
            dispatch({
              t: 'pomo',
              patch: { running: false, remaining: POMO_LENGTHS[p.mode] },
            })
          }
        >
          Reset
        </button>
      </div>

      <div className="pomo-count">{p.completed} completed</div>
    </section>
  );
}
