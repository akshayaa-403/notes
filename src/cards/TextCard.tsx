import type { Card } from '../types';
import { useStore } from '../state/StoreContext';
import { Autosize } from '../components/Autosize';

export function TextCard({ card }: { card: Extract<Card, { type: 'text' }> }) {
  const { dispatch } = useStore();
  return (
    <Autosize
      className="field text-body"
      placeholder="Start writing…"
      value={card.data.body}
      onChange={(e) =>
        dispatch({ t: 'card/data', id: card.id, data: { body: e.target.value } })
      }
    />
  );
}
