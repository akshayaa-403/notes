import { useState } from 'react';
import type { Card } from '../types';
import { useStore } from '../state/StoreContext';
import { Autosize } from '../components/Autosize';

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url; // Keep the raw text rather than showing nothing.
  }
};

export function LinkCard({ card }: { card: Extract<Card, { type: 'link' }> }) {
  const { dispatch } = useStore();
  const { url, name } = card.data;
  const [draft, setDraft] = useState('');
  const [faviconFailed, setFaviconFailed] = useState(false);

  const setData = (data: { url: string; name: string }) =>
    dispatch({ t: 'card/data', id: card.id, data });

  if (url) {
    const host = hostOf(url);
    return (
      <>
        <a
          className="link-preview"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {!faviconFailed && (
            <img
              className="link-favicon"
              alt=""
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`}
              onError={() => setFaviconFailed(true)}
            />
          )}
          <span className="link-meta">
            <span className="link-name">{name || host}</span>
            <span className="link-url">{url}</span>
          </span>
        </a>
        <button
          className="add-row"
          onClick={() => {
            setDraft(url);
            setData({ url: '', name });
          }}
        >
          Edit link
        </button>
      </>
    );
  }

  const apply = () => {
    const v = draft.trim();
    if (!v) return;
    // A bare domain is what people actually type, so assume https.
    setData({ url: /^https?:\/\//i.test(v) ? v : `https://${v}`, name });
    setDraft('');
  };

  return (
    <>
      <Autosize
        className="field"
        placeholder="Label (optional)"
        value={name}
        aria-label="Link label"
        onChange={(e) => setData({ url, name: e.target.value })}
      />
      <Autosize
        className="field"
        placeholder="https://…"
        value={draft}
        aria-label="Link address"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
        }}
      />
      <button className="add-row" onClick={apply}>
        Save link
      </button>
    </>
  );
}
