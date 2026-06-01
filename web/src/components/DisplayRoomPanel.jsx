/** כרטיס חדר בסגנון לוח תורים (מספר תור גדול + חדר) */

import { formatRoomNumberBadge, isReceptionRoom } from '../lib/roomDisplay';

function roomNumberOnly(room) {
  if (isReceptionRoom(room)) return null;
  const n = room?.room_number?.trim();
  return n || null;
}

export default function DisplayRoomPanel({ room, current, waiting = [], large = false }) {
  const accent = room?.color || '#2e7d32';
  const roomNum = roomNumberOnly(room);
  const roomBadge = formatRoomNumberBadge(room);
  const ticket = current?.display_code;
  const nextWait = !current && waiting[0]?.display_code;
  const showCode = ticket || nextWait;
  const isWaiting = !current && waiting.length > 0;

  return (
    <article
      className={`display-panel${large ? ' display-panel--large' : ''}${!showCode ? ' display-panel--idle' : ''}`}
      style={{ '--panel-accent': accent }}
    >
      <div className="display-panel__card">
        <div className="display-panel__ticket-col">
          <span className="display-panel__ticket" aria-live="polite">
            {showCode || '—'}
          </span>
          {isWaiting && <span className="display-panel__ticket-hint">ממתין</span>}
        </div>
        <div className="display-panel__room-col">
          {roomNum ? (
            <>
              <span className="display-panel__room-label">חדר מספר</span>
              <span className="display-panel__room-num">{roomNum}</span>
            </>
          ) : roomBadge ? (
            <span className="display-panel__room-reception">{roomBadge}</span>
          ) : (
            <span className="display-panel__room-num display-panel__room-num--text">—</span>
          )}
        </div>
      </div>
      <p className="display-panel__name">{room?.name}</p>
      {current && waiting.length > 0 && (
        <p className="display-panel__queue-hint">
          הבא בתור: <strong>{waiting[0].display_code}</strong>
          {waiting.length > 1 ? ` (+${waiting.length - 1})` : ''}
        </p>
      )}
    </article>
  );
}
