import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { resolveLastRoomId } from '../lib/lastRoomCookie';

export default function RoomStationRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rooms = await api.getRooms();
        const id = resolveLastRoomId(rooms);
        if (cancelled) return;
        if (id) navigate(`/room/${id}`, { replace: true });
        else navigate('/', { replace: true });
      } catch {
        if (!cancelled) navigate('/', { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return <div className="room-station-redirect">טוען עמדת חדר...</div>;
}
