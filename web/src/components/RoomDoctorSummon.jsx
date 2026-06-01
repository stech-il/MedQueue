import { useState } from 'react';
import { isReceptionRoom, roomSummonLabel } from '../lib/roomDisplay';

export default function RoomDoctorSummon({ rooms, stationRoomId, loading, onSummon }) {
  const targets = (rooms || []).filter((r) => r.id !== stationRoomId && !isReceptionRoom(r));
  const [targetId, setTargetId] = useState(() => String(targets[0]?.id || ''));

  if (!targets.length) return null;

  return (
    <section className="room-summon">
      <h2 className="room-summon__title">קריאה דחופה לרופא</h2>
      <p className="room-summon__hint">מושמע במסך הראשי</p>
      <div className="room-summon__row">
        <select
          className="room-summon__select"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          disabled={loading}
          aria-label="חדר יעד"
        >
          {targets.map((r) => (
            <option key={r.id} value={r.id}>
              {roomSummonLabel(r)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rs-btn rs-btn--urgent"
          disabled={loading || !targetId}
          onClick={() => onSummon(Number(targetId))}
        >
          השמע קריאה
        </button>
      </div>
    </section>
  );
}
