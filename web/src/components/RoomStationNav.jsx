import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatRoomNumberBadge } from '../lib/roomDisplay';

function RoomsIcon() {
  return (
    <svg
      className="room-station-nav__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="7" height="16" rx="1.5" />
      <rect x="14" y="4" width="7" height="16" rx="1.5" />
      <path d="M6.5 11h1M16.5 11h1M6.5 15h1M16.5 15h1" strokeWidth="2.5" />
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
        onClick={() => setOpen((v) => !v)}
      >
        <RoomsIcon />
        <span className="room-station-nav__toggle-label">חדרים</span>
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
