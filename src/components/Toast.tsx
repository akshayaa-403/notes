import { useEffect } from 'react';

interface Props {
  message: string;
  onDismiss: () => void;
  /** 0 keeps it up until dismissed — used for errors worth acknowledging. */
  timeout?: number;
}

export function Toast({ message, onDismiss, timeout = 0 }: Props) {
  useEffect(() => {
    if (!timeout) return;
    const id = window.setTimeout(onDismiss, timeout);
    return () => clearTimeout(id);
  }, [timeout, onDismiss, message]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{message}</span>
      <button className="icon-btn sm" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
