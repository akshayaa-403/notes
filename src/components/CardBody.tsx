import type { Card } from '../types';
import { TextCard } from '../cards/TextCard';
import { ListCard } from '../cards/ListCard';
import { LinkCard } from '../cards/LinkCard';
import { ImageCard } from '../cards/ImageCard';
import { TableCard } from '../cards/TableCard';

/* Switching on card.type here rather than looking a component up in the
   registry is what lets TypeScript narrow `card.data` to the payload that
   matches the type. A registry of heterogeneous components would need a cast
   at exactly the point the types are most worth having. */
export function CardBody({ card }: { card: Card }) {
  switch (card.type) {
    case 'text':
      return <TextCard card={card} />;
    case 'checklist':
      return <ListCard card={card} kind="check" />;
    case 'bulleted':
      return <ListCard card={card} kind="bullet" />;
    case 'numbered':
      return <ListCard card={card} kind="number" />;
    case 'link':
      return <LinkCard card={card} />;
    case 'image':
      return <ImageCard card={card} />;
    case 'table':
      return <TableCard card={card} />;
  }
}
