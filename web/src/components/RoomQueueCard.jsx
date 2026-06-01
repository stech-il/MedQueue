/** כרטיס חדר במסך תצוגה — עיצוב MedQueue */

import { formatRoomNumberBadge } from '../lib/roomDisplay';

export default function RoomQueueCard({ room, current, waiting = [] }) {
  const accent = room?.color || '#3b82f6';
  const hasContent = current || waiting.length > 0;
  const roomNumBadge = formatRoomNumberBadge(room);

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
          <ul className="room-queue-card__list">
            {current && (
              <li className="room-queue-card__item room-queue-card__item--active">
                <span className="room-queue-card__code room-queue-card__code--current">
                  {current.display_code}
                </span>
                <span className="room-queue-card__status">
                  {current.status === 'serving' ? 'בטיפול' : 'כרגע מטופל'}
                </span>
              </li>
            )}
            {waiting.map((t) => (
              <li key={t.id} className="room-queue-card__item">
                <span className="room-queue-card__code room-queue-card__code--wait">
                  {t.display_code}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
