import { useRef, useState } from 'react';
import type { Card } from '../types';
import { useStore } from '../state/StoreContext';
import { Autosize } from '../components/Autosize';
import { CARD_IMAGE_MAX, imageFromTransfer, readImageFile } from '../lib/image';

export function ImageCard({ card }: { card: Extract<Card, { type: 'image' }> }) {
  const { dispatch } = useStore();
  const { src, caption } = card.data;
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const setData = (data: { src: string; caption: string }) =>
    dispatch({ t: 'card/data', id: card.id, data });

  const take = async (file: File | null) => {
    const next = await readImageFile(file, CARD_IMAGE_MAX);
    if (next) setData({ src: next, caption });
  };

  if (src) {
    return (
      <>
        <img className="card-image" src={src} alt={caption} />
        <Autosize
          className="field image-caption"
          placeholder="Add a caption…"
          value={caption}
          aria-label="Image caption"
          onChange={(e) => setData({ src, caption: e.target.value })}
        />
        <button className="add-row" onClick={() => setData({ src: '', caption })}>
          Replace image
        </button>
      </>
    );
  }

  return (
    <>
      <button
        className={'image-drop' + (over ? ' over' : '')}
        onClick={() => picker.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(imageFromTransfer(e.dataTransfer));
        }}
        // Paste works while the drop zone has focus.
        onPaste={(e) => void take(imageFromTransfer(e.clipboardData))}
      >
        Click, drop or paste an image
      </button>
      <input
        ref={picker}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void take(e.target.files?.[0] ?? null);
          // Clear it so choosing the same file twice still fires a change.
          e.target.value = '';
        }}
      />
    </>
  );
}
