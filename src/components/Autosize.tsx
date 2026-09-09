import { useCallback, useLayoutEffect, useRef, type Ref, type TextareaHTMLAttributes } from 'react';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** React 19 passes ref as an ordinary prop; callers use it to move focus. */
  ref?: Ref<HTMLTextAreaElement>;
};

/** A textarea that grows with its content instead of scrolling. */
export function Autosize({ ref: forwarded, ...props }: Props) {
  const own = useRef<HTMLTextAreaElement>(null);

  // The caller's ref and this component's own both need the node, so the two
  // are merged here rather than one silently winning.
  const setNode = useCallback(
    (node: HTMLTextAreaElement | null) => {
      own.current = node;
      if (typeof forwarded === 'function') forwarded(node);
      else if (forwarded) forwarded.current = node;
    },
    [forwarded]
  );

  // Runs on every render, not just on input: pasted text, an undo, and a value
  // arriving from the store all change the height too. Layout effect so the
  // height is right before the browser paints, avoiding a visible jump.
  useLayoutEffect(() => {
    const ta = own.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  });

  return <textarea {...props} ref={setNode} rows={1} />;
}
