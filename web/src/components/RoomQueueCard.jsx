/** כרטיס חדר במסך תצוגה — עיצוב MedQueue */

import { formatRoomNumberBadge } from '../lib/roomDisplay';
import WaitingNumbersGrid from './WaitingNumbersGrid';

export default function RoomQueueCard({ room, current, waiting = [] }) {
  const accent = room?.color || '#3b82f6';
  const hasContent = current || waiting.length > 0;
  const roomNumBadge = formatRoomNumberBadge(room);
  const waitSize = current ? 'sm' : 'md';

  return (
    <article className="room-queue-card" style={{ '--room-accent': accent }}>
      <header className="room-queue-card__head">
        <h3 className="room-queue-card__title">{room?.name}</h3>
        {roomNumBadge && <span className="room-queue-card__room-num">{roomNumBadge}</span>}
      </header>
      <div className="room-queue-card__body">
        {!hasContent ? (
          <p className="room-queue-card__empty">אין ממתינים</p>
        ) : (
          <div className="room-queue-card__stack">
            {current && (
              <div className="room-queue-card__current">
                <span className="room-queue-card__code room-queue-card__code--current">
                  {current.display_code}
                </span>
                <span className="room-queue-card__status">
                  {current.status === 'serving' ? 'בטיפול' : 'כרגע מטופל'}
                </span>
              </div>
            )}
            {waiting.length > 0 && (
              <>
                {current && (
                  <p className="room-queue-card__wait-label">ממתינים ({waiting.length})</p>
                )}
                <WaitingNumbersGrid tickets={waiting} size={waitSize} />
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
