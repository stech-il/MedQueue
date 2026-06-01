import { useMemo, useState } from 'react';
import { isDoctorRoom, isReceptionRoom } from '../lib/roomDisplay';
import { formatWaitMinutes } from '../lib/waitTime';

function ForwardControl({ ticket, doctorRooms, loading, onForward }) {
  if (!doctorRooms?.length) return null;

  if (doctorRooms.length > 2) {
    return (
      <select
        className="room-waiting__forward-select"
        disabled={loading}
        defaultValue=""
        onChange={(e) => {
          const id = Number(e.target.value);
          e.target.value = '';
          if (!id) return;
          const dr = doctorRooms.find((r) => r.id === id);
          if (dr) onForward(ticket, dr);
        }}
      >
        <option value="">העבר ל…</option>
        {doctorRooms.map((dr) => (
          <option key={dr.id} value={dr.id}>
            {dr.name}
          </option>
        ))}
      </select>
    );
  }

  return doctorRooms.map((dr) => (
    <button
      key={dr.id}
      type="button"
      className="rs-btn rs-btn--xs rs-btn--outline"
      disabled={loading}
      onClick={() => onForward(ticket, dr)}
    >
      {dr.name}
    </button>
  ));
}

export default function RoomWaitingList({
  queue,
  room,
  current,
  loading,
  healthFunds = [],
  doctorRooms,
  onBump,
  onClearPriority,
  onCall,
  onForward,
}) {
  const isReception = isReceptionRoom(room);
  const isDoctor = isDoctorRoom(room);
  const canCall = !current;

  const [search, setSearch] = useState('');
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [fundFilter, setFundFilter] = useState('');

  const filtered = useMemo(() => {
    let list = queue || [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.display_code?.toLowerCase().includes(q) ||
          t.id_number?.includes(q) ||
          t.phone?.includes(q)
      );
    }
    if (priorityOnly) list = list.filter((t) => t.priority > 0);
    if (fundFilter) list = list.filter((t) => (t.health_fund || '') === fundFilter);
    return list;
  }, [queue, search, priorityOnly, fundFilter]);

  return (
    <section className="room-waiting">
      <header className="room-waiting__head">
        <h2 className="room-waiting__title">ממתינים</h2>
        <span className="room-waiting__count">{queue?.length || 0}</span>
      </header>

      {(queue?.length || 0) > 0 && (
        <div className="room-waiting__toolbar">
          <input
            type="search"
            className="room-waiting__search"
            placeholder="חיפוש תור, ת.ז. או טלפון"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="room-waiting__check">
            <input
              type="checkbox"
              checked={priorityOnly}
              onChange={(e) => setPriorityOnly(e.target.checked)}
            />
            <span>עדיפות בלבד</span>
          </label>
          {isReception && healthFunds.length > 0 && (
            <select
              className="room-waiting__fund"
              value={fundFilter}
              onChange={(e) => setFundFilter(e.target.value)}
            >
              <option value="">כל הקופות</option>
              {healthFunds.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {!queue?.length ? (
        <p className="room-waiting__empty">אין ממתינים כרגע</p>
      ) : !filtered.length ? (
        <p className="room-waiting__empty">אין תוצאות לסינון</p>
      ) : (
        <div className="room-waiting__table-wrap">
          <table className="room-waiting__table">
            <thead>
              <tr>
                <th>#</th>
                <th>תור</th>
                <th>המתנה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const pos = (queue || []).findIndex((x) => x.id === t.id) + 1;
                return (
                  <tr key={t.id} className={t.priority > 0 ? 'room-waiting__row--priority' : ''}>
                    <td className="room-waiting__cell-pos">{pos}</td>
                    <td className="room-waiting__cell-code">
                      <span className="room-waiting__code">{t.display_code}</span>
                      {t.priority > 0 && (
                        <span className="room-waiting__priority">עדיפות</span>
                      )}
                      {t.health_fund && isReception && (
                        <span className="room-waiting__fund-tag">{t.health_fund}</span>
                      )}
                      {t.queue_room_name && t.queue_room_name !== room.name && (
                        <span className="room-waiting__from">{t.queue_room_name}</span>
                      )}
                    </td>
                    <td className="room-waiting__cell-wait">{formatWaitMinutes(t.created_at)}</td>
                    <td className="room-waiting__cell-actions">
                      <div className="room-waiting__action-group">
                        {isReception && (
                          <>
                            <button
                              type="button"
                              className="rs-btn rs-btn--xs rs-btn--warn"
                              disabled={loading}
                              onClick={() => onBump(t)}
                            >
                              קדם
                            </button>
                            {t.priority > 0 && (
                              <button
                                type="button"
                                className="rs-btn rs-btn--xs rs-btn--ghost"
                                disabled={loading}
                                onClick={() => onClearPriority(t)}
                              >
                                בטל
                              </button>
                            )}
                            <ForwardControl
                              ticket={t}
                              doctorRooms={doctorRooms}
                              loading={loading}
                              onForward={onForward}
                            />
                          </>
                        )}
                        {isDoctor && (
                          <button
                            type="button"
                            className="rs-btn rs-btn--xs rs-btn--primary"
                            disabled={loading || !canCall}
                            title={!canCall ? 'סיים טיפול נוכחי' : ''}
                            onClick={() => onCall(t)}
                          >
                            קרא
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
