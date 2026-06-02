import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useSocket } from '../hooks/useSocket';
import RoomStationNav from '../components/RoomStationNav';
import RoomWaitingList from '../components/RoomWaitingList';
import RoomDoctorSummon from '../components/RoomDoctorSummon';
import { setLastRoomId } from '../lib/lastRoomCookie';
import { playStationServingChime } from '../lib/stationChime';
import {
  formatRoomNumberBadge,
  isDoctorRoom,
  isReceptionRoom,
} from '../lib/roomDisplay';

export default function RoomStation() {
  const { roomId } = useParams();
  const rid = Number(roomId);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [pulse, setPulse] = useState(false);
  const prevCurrentIdRef = useRef(null);

  const load = useCallback(async () => {
    if (!rid) return;
    setState(await api.getRoomStation(rid));
  }, [rid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (state?.room?.id) setLastRoomId(state.room.id);
  }, [state?.room?.id]);

  useEffect(() => {
    const cur = state?.current;
    const id = cur?.id ?? null;
    const prev = prevCurrentIdRef.current;
    if (id && id !== prev && cur?.status === 'serving') {
      setPulse(true);
      playStationServingChime();
      const t = setTimeout(() => setPulse(false), 1200);
      prevCurrentIdRef.current = id;
      return () => clearTimeout(t);
    }
    prevCurrentIdRef.current = id;
  }, [state?.current?.id, state?.current?.status]);

  useSocket({
    'state:refresh': load,
    'ticket:created': load,
    'ticket:called': load,
    'ticket:updated': load,
    'ticket:moved': load,
    'ticket:completed': load,
  });

  const act = async (fn, ok) => {
    setLoading(true);
    setMsg('');
    try {
      await fn();
      setMsg(ok);
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3500);
    }
  };

  if (!state) {
    return (
      <div className="room-station room-station--loading">
        <p>טוען עמדה…</p>
      </div>
    );
  }

  const {
    room,
    current,
    next,
    waitingCount,
    queue,
    otherRooms,
    allRooms,
    settings,
    health_funds,
  } = state;
  const doctorRooms = (allRooms || otherRooms || []).filter(
    (r) => isDoctorRoom(r) && r.id !== rid
  );
  const showQueueTools = isReceptionRoom(room) || isDoctorRoom(room);
  const roomBadge = formatRoomNumberBadge(room);
  const clinicName = settings?.clinic_name || 'MedQueue';
  const accent = room.color || '#0d9488';
  const noWaiting = waitingCount === 0;

  return (
    <div
      className={`room-station${pulse ? ' room-station--pulse' : ''}`}
      style={{ '--rs-accent': accent }}
    >
      {msg && (
        <div className="room-station__toast" role="status">
          {msg}
        </div>
      )}

      <header className="room-station__topbar">
        <div className="room-station__container room-station__topbar-inner">
          <RoomStationNav currentRoomId={rid} />
          <div className="room-station__topbar-text">
            <p className="room-station__clinic">{clinicName}</p>
            <h1 className="room-station__title">{room.name}</h1>
            {roomBadge && <p className="room-station__subtitle">{roomBadge}</p>}
          </div>
          <div className="room-station__topbar-stat">
            <span className="room-station__stat-value">{waitingCount}</span>
            <span className="room-station__stat-label">ממתינים</span>
          </div>
        </div>
      </header>

      <div className="room-station__container room-station__main">
      <div className="room-station__hero">
        <div className="room-station__summary">
          <div className="room-station__summary-col room-station__summary-col--current">
            <div className="room-station__summary-head">
              <span className="room-station__summary-label">מטופל בחדר</span>
              {current && (
                <span className="room-station__status room-station__status--serving">בטיפול</span>
              )}
            </div>
            {current ? (
              <>
                <div className="room-station__summary-ticket">{current.display_code}</div>
                {current.id_number && (
                  <p className="room-station__id" dir="ltr">
                    ת.ז. {current.id_number}
                  </p>
                )}
              </>
            ) : (
              <p className="room-station__summary-empty">אין מטופל</p>
            )}
          </div>
          <div className="room-station__summary-divider" aria-hidden />
          <div className="room-station__summary-col room-station__summary-col--next">
            <span className="room-station__summary-label">הבא בתור</span>
            <p className="room-station__summary-next">
              {next ? (
                <strong>{next.display_code}</strong>
              ) : (
                <span className="room-station__muted">אין ממתינים</span>
              )}
            </p>
          </div>
        </div>

        <div className="room-station__hero-actions">
          <div className="room-station__btn-grid">
            <button
              type="button"
              className="rs-btn rs-btn--primary rs-btn--lg"
              disabled={loading || !!current || noWaiting}
              title={
                current
                  ? 'סיים טיפול לפני קריאה הבאה'
                  : noWaiting
                    ? 'אין ממתינים בתור'
                    : ''
              }
              onClick={() => act(() => api.callNext(rid), 'המטופל נקרא — בטיפול')}
            >
              קריאה למטופל הבא
            </button>
            {current && (
              <>
                <button
                  type="button"
                  className="rs-btn rs-btn--secondary"
                  disabled={loading}
                  onClick={() => act(() => api.announceTicket(current.id), 'קרא שוב')}
                >
                  קרא שוב
                </button>
                <button
                  type="button"
                  className="rs-btn rs-btn--danger"
                  disabled={loading}
                  onClick={() => act(() => api.completeTicket(current.id), 'הטיפול הושלם')}
                >
                  סיים טיפול
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="room-station__body">
        <div className="room-station__queue-panel">
          {showQueueTools ? (
            <RoomWaitingList
              queue={queue}
              room={room}
              current={current}
              loading={loading}
              healthFunds={health_funds || []}
              doctorRooms={doctorRooms}
              onBump={(t) => act(() => api.bumpTicketPriority(t.id), 'עודכנה עדיפות')}
              onClearPriority={(t) =>
                act(() => api.clearTicketPriority(t.id), 'הקידום בוטל')
              }
              onCall={(t) =>
                act(() => api.callTicketAtStation(rid, t.id), `${t.display_code} — בטיפול`)
              }
              onForward={(t, dr) =>
                act(() => api.forwardTicket(t.id, dr.id), `הועבר ל${dr.name}`)
              }
            />
          ) : (
            <section className="room-station__card room-station__card--side-empty">
              <h2>תור</h2>
              <p className="room-station__muted">אין רשימת ממתינים לחדר זה</p>
            </section>
          )}
        </div>

        <div className="room-station__extras">
          {(isReceptionRoom(room) || isDoctorRoom(room)) && (
            <RoomDoctorSummon
              rooms={allRooms || []}
              stationRoomId={rid}
              loading={loading}
              onSummon={(targetRoomId) =>
                act(() => api.summonDoctor(rid, targetRoomId), 'קריאה דחופה הושמעה במסך')
              }
            />
          )}
          {otherRooms.length > 0 && (
            <section className="room-station__card room-station__card--compact">
              <h2>העברת מטופל</h2>
              <div className="room-station__transfer-grid">
                {otherRooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="rs-btn rs-btn--outline"
                    disabled={!current || loading}
                    onClick={() =>
                      act(() => api.moveTicket(current.id, r.id), `הועבר ל${r.name}`)
                    }
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      </div>

      <footer className="room-station__footer">
        <div className="room-station__container">
          <p className="room-station__credit">פותח ע&quot;י שיטכנולוגיות 2026</p>
        </div>
      </footer>
    </div>
  );
}
