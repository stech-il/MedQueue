import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatRoomNumberBadge } from '../lib/roomDisplay';

function RoomsIcon() {
  return (
    <svg className="room-station-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 5a2 2 0 0 1 2-2h3v18H5a2 2 0 0 1-2-2V5zm8 2a2 2 0 0 1 2-2h3v16h-3a2 2 0 0 1-2-2V7zm8-2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3V3h3zM6 7v2h2V7H6zm8 4v2h2v-2h-2zm8 4v2h2v-2h-2z"
      />
    </svg>
  );
}

export default function RoomStationNav({ currentRoomId }) {
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const wrapRef = useRef(null);

  useEffect(() => {
    api.getRooms().then(setRooms).catch(() => setRooms([]));
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [currentRoomId]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  return (
    <div className="room-station-nav" ref={wrapRef}>
      <button
        type="button"
        className="room-station-nav__toggle"
        aria-label="מעבר לעמדת חדר אחר"
        aria-expanded={open}
        title="חדרים"
        onClick={() => setOpen((v) => !v)}
      >
        <RoomsIcon />
      </button>
      {open && (
        <div className="room-station-nav__panel" role="menu">
          <p className="room-station-nav__panel-title">בחר חדר</p>
          <ul className="room-station-nav__list">
            {rooms.map((r) => {
              const badge = formatRoomNumberBadge(r);
              const active = r.id === currentRoomId;
              return (
                <li key={r.id}>
                  <Link
                    to={`/room/${r.id}`}
                    className={`room-station-nav__item${active ? ' room-station-nav__item--active' : ''}`}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    <span
                      className="room-station-nav__dot"
                      style={{ background: r.color || '#0ea5e9' }}
                    />
                    <span className="room-station-nav__item-text">
                      <span className="room-station-nav__item-name">{r.name}</span>
                      {badge && <span className="room-station-nav__item-badge">{badge}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {rooms.length === 0 && (
            <p className="room-station-nav__empty">אין חדרים פעילים</p>
          )}
        </div>
      )}
    </div>
  );
}
