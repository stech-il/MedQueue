/** הודעות רצות בתחתית המסך — פס גלילה אופקי אחד */

import { flattenTickerMessage, parseTickerBoldParts } from '../lib/tickerFormat';
import { getTickerBarStyle } from '../lib/tickerSize';

function TickerLine({ line }) {
  const parts = parseTickerBoldParts(line);
  return (
    <span className="ticker-line">
      {parts.map((p, i) =>
        p.bold ? (
          <strong key={i} className="ticker-bold">
            {p.text}
          </strong>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </span>
  );
}

function TickerMessage({ text }) {
  const line = flattenTickerMessage(text);
  if (!line) return null;
  return (
    <span className="ticker-msg">
      <TickerLine line={line} />
    </span>
  );
}

function TickerSequence({ items, idPrefix, duplicate }) {
  return (
    <div className="ticker-sequence" aria-hidden={duplicate || undefined}>
      {items.map((msg, i) => (
        <span key={`${idPrefix}-${i}`} className="ticker-item">
          <span className="ticker-bullet" aria-hidden="true">
            ◆
          </span>
          <TickerMessage text={msg} />
        </span>
      ))}
    </div>
  );
}

export default function Ticker({ messages = [], size = 'md' }) {
  const items = messages.length ? messages : ['ברוכים הבאים למוקד הרפואי'];

  return (
    <div className="ticker-bar" style={getTickerBarStyle(size)} aria-label="הודעות">
      <div className="ticker-viewport">
        <div className="ticker-track">
          <TickerSequence items={items} idPrefix="a" />
          <TickerSequence items={items} idPrefix="b" duplicate />
        </div>
      </div>
    </div>
  );
}
