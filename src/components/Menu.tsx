import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  label?: string;
  children: ReactNode;
  align?: 'left' | 'right';
}

/* One popover implementation for every menu in the app. The original had this
   logic duplicated per menu, each with its own document-level click handler. */
export function Menu({ open, onOpenChange, trigger, label, children, align = 'right' }: Props) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
        // Escape should hand focus back to the button that opened the menu.
        wrap.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="menu-wrap" ref={wrap}>
      <span onClick={() => onOpenChange(!open)}>{trigger}</span>
      {open && (
        <div className={'menu menu-' + align} role="menu">
          {label && <div className="menu-label">{label}</div>}
          {children}
        </div>
      )}
    </div>
  );
}
