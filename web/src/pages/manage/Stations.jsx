import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { formatRoomNumberBadge } from '../../lib/roomDisplay';

export default function Stations() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    api.getRooms().then(setRooms);
  }, []);

  return (
    <div>
      <h1 className="stations-page__title">עמדות חדר — בחר עמדה</h1>
      <div className="stations-grid">
        {rooms.map((r) => {
          const badge = formatRoomNumberBadge(r);
          return (
            <Link key={r.id} to={`/room/${r.id}`} className="station-tile" style={{ '--tile-accent': r.color }}>
              <span className="station-tile__name">{r.name}</span>
              {badge && <span className="station-tile__num">{badge}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
