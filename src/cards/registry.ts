import type { Card, CardDataMap, CardType } from '../types';
import { uid } from '../lib/uid';

/* Adding a card type
   ------------------
   1. Add its payload to CardDataMap in types.ts.
   2. Add an entry here: label, glyph, and its initial data.
   3. Add a case to the switch in components/CardBody.tsx.

   The board, persistence and all three layouts come for free. This module is
   deliberately React-free so the reducer can import it without a cycle. */

export interface TypeMeta {
  label: string;
  glyph: string;
}

export const TYPE_META: Record<CardType, TypeMeta> = {
  text: { label: 'Text', glyph: '✎' },
  checklist: { label: 'Checklist', glyph: '☑' },
  bulleted: { label: 'Bulleted list', glyph: '•' },
  numbered: { label: 'Numbered list', glyph: '1.' },
  link: { label: 'Link', glyph: '\u{1F517}' },
  image: { label: 'Image', glyph: '\u{1F5BC}' },
  table: { label: 'Table', glyph: '▦' },
};

/** Menu order, which is not the same as object key order. */
export const TYPE_ORDER: CardType[] = [
  'text', 'checklist', 'bulleted', 'numbered', 'link', 'image', 'table',
];

export function emptyData<K extends CardType>(type: K): CardDataMap[K];
export function emptyData(type: CardType): Card['data'] {
  switch (type) {
    case 'text':
      return { body: '' };
    case 'checklist':
      return { items: [{ id: uid(), text: '', done: false }] };
    case 'bulleted':
    case 'numbered':
      return { items: [{ id: uid(), text: '' }] };
    case 'link':
      return { url: '', name: '' };
    case 'image':
      return { src: '', caption: '' };
    case 'table':
      return { rows: [['Column', 'Column'], ['', '']] };
  }
}
