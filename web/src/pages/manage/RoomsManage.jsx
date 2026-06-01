import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

const TYPES = [
  { value: 'reception', label: 'קבלה' },
  { value: 'waiting', label: 'המתנה' },
  { value: 'doctor', label: 'רופא' },
  { value: 'lab', label: 'מעבדה' },
];

function buildDraft(rooms) {
  const d = {};
  for (const r of rooms) {
    const linkedRoomIds = rooms
      .filter(
        (o) =>
          o.id !== r.id &&
          o.is_active &&
          r.shared_group &&
          o.shared_group === r.shared_group
      )
      .map((o) => o.id);
    d[r.id] = {
      name: r.name,
      room_number: r.room_number || '',
      slug: r.slug,
      type: r.type,
      color: r.color,
      shared_group: r.shared_group || '',
      linkedRoomIds,
      sort_order: r.sort_order,
      is_active: r.is_active,
    };
  }
  return d;
}

function typeLabel(value) {
  return TYPES.find((t) => t.value === value)?.label || value;
}

export default function RoomsManage() {
  const [rooms, setRooms] = useState([]);
  const [draft, setDraft] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgIsError, setMsgIsError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    room_number: '',
    slug: '',
    type: 'doctor',
    color: '#2563eb',
  });

  const activeRooms = rooms.filter((r) => r.is_active);

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id),
    [rooms]
  );

  const load = () => api.getRoomsAll().then(setRooms);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setDraft(buildDraft(rooms));
  }, [rooms]);

  useEffect(() => {
    if (rooms.length && selectedId == null) setSelectedId(rooms[0].id);
  }, [rooms, selectedId]);

  useEffect(() => {
    if (selectedId && rooms.length && !rooms.find((r) => r.id === selectedId)) {
      setSelectedId(rooms[0].id);
    }
  }, [rooms, selectedId]);

  const patchDraft = (id, patch) => {
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const toggleLink = (roomId, otherId) => {
    setDraft((prev) => {
      const cur = prev[roomId];
      const ids = new Set(cur.linkedRoomIds);
      if (ids.has(otherId)) ids.delete(otherId);
      else ids.add(otherId);
      return { ...prev, [roomId]: { ...cur, linkedRoomIds: [...ids] } };
    });
  };

  const setSharedMode = (roomId, independent) => {
    setDraft((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        shared_group: independent ? '' : prev[roomId].shared_group || 'קבוצה-1',
        linkedRoomIds: independent ? [] : prev[roomId].linkedRoomIds,
      },
    }));
  };

  const showMsg = (text, isError = false) => {
    setMsg(text);
    setMsgIsError(isError);
    setTimeout(() => {
      setMsg('');
      setMsgIsError(false);
    }, isError ? 8000 : 3000);
  };

  const save = async (id) => {
    const d = draft[id];
    if (!d) return;
    try {
      await api.updateRoom(id, {
        name: d.name,
        room_number: String(d.room_number ?? '').trim() || null,
        slug: d.slug,
        type: d.type,
        color: d.color,
        sort_order: Number(d.sort_order) || 0,
        is_active: d.is_active,
        shared_group: d.shared_group?.trim() || null,
        linked_room_ids: d.shared_group?.trim() ? d.linkedRoomIds : [],
      });
      showMsg(`"${d.name}" נשמר`);
      load();
    } catch (e) {
      showMsg(e.message, true);
    }
  };

  const removeRoom = async (id) => {
    const name = draft[id]?.name || 'חדר';
    if (!confirm(`למחוק את "${name}"?\nלא ניתן לשחזר.`)) return;
    try {
      await api.deleteRoom(id);
      showMsg(`"${name}" נמחק`);
      load();
    } catch (e) {
      showMsg(e.message, true);
    }
  };

  const addRoom = async () => {
    if (!newRoom.name.trim() || !newRoom.slug.trim()) {
      showMsg('שם ו-slug נדרשים', true);
      return;
    }
    try {
      const created = await api.createRoom(newRoom);
      setNewRoom({ name: '', room_number: '', slug: '', type: 'doctor', color: '#2563eb' });
      setShowAdd(false);
      showMsg('חדר נוסף');
      await load();
      setSelectedId(created.id);
    } catch (e) {
      showMsg(e.message, true);
    }
  };

  const partnerNames = (roomId) => {
    const d = draft[roomId];
    if (!d?.shared_group?.trim()) return null;
    return activeRooms
      .filter((r) => r.id === roomId || d.linkedRoomIds.includes(r.id))
      .map((r) => (r.id === roomId ? `${r.name} (זה)` : r.name));
  };

  const d = selectedId ? draft[selectedId] : null;
  const isShared = Boolean(d?.shared_group?.trim());
  const others = activeRooms.filter((o) => o.id !== selectedId);
  const partners = selectedId ? partnerNames(selectedId) : null;

  return (
    <div className="rooms-manage">
      <header className="rooms-manage__head">
        <div>
          <h1 className="rooms-manage__title">ניהול חדרים</h1>
          <p className="rooms-manage__sub">
            בחר חדר מהרשימה, ערוך בצד שמאל ולחץ שמור. תור משותף — מסמנים חדרים מקושרים.
          </p>
        </div>
        <button type="button" className="btn-success" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'סגור' : '+ חדר חדש'}
        </button>
      </header>

      {msg && (
        <div className={`rooms-manage__toast ${msgIsError ? 'rooms-manage__toast--err' : ''}`}>
          {msg}
        </div>
      )}

      {showAdd && (
        <section className="rooms-manage__add card">
          <h2 className="rooms-manage__section-title">חדר חדש</h2>
          <div className="rooms-manage__form-grid">
            <label className="rooms-manage__field">
              <span>שם לתצוגה</span>
              <input
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
              />
            </label>
            <label className="rooms-manage__field">
              <span>מספר חדר (הקראה)</span>
              <input
                value={newRoom.room_number}
                onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
                dir="ltr"
                placeholder="9"
              />
            </label>
            <label className="rooms-manage__field">
              <span>slug</span>
              <input
                value={newRoom.slug}
                onChange={(e) => setNewRoom({ ...newRoom, slug: e.target.value })}
                dir="ltr"
                placeholder="doctor-3"
              />
            </label>
            <label className="rooms-manage__field">
              <span>סוג</span>
              <select
                value={newRoom.type}
                onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="rooms-manage__field rooms-manage__field--color">
              <span>צבע</span>
              <input
                type="color"
                value={newRoom.color}
                onChange={(e) => setNewRoom({ ...newRoom, color: e.target.value })}
              />
            </label>
          </div>
          <button type="button" className="btn-primary" onClick={addRoom}>
            הוסף חדר
          </button>
        </section>
      )}

      <div className="rooms-manage__layout">
        <aside className="rooms-manage__list card">
          <p className="rooms-manage__list-title">חדרים ({rooms.length})</p>
          <ul className="rooms-manage__list-ul">
            {sortedRooms.map((r) => {
              const item = draft[r.id];
              if (!item) return null;
              const shared = Boolean(item.shared_group?.trim());
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`rooms-manage__list-item ${selectedId === r.id ? 'rooms-manage__list-item--on' : ''}`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <span
                      className="rooms-manage__dot"
                      style={{ background: item.color }}
                      aria-hidden
                    />
                    <span className="rooms-manage__list-text">
                      <span className="rooms-manage__list-name">{item.name}</span>
                      <span className="rooms-manage__list-meta">
                        {item.room_number ? `מס׳ ${item.room_number}` : typeLabel(item.type)}
                        {shared && ' · תור משותף'}
                        {!item.is_active && ' · לא פעיל'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="rooms-manage__editor card">
          {!d ? (
            <p className="rooms-manage__empty">בחר חדר מהרשימה</p>
          ) : (
            <>
              <div className="rooms-manage__editor-head">
                <div className="rooms-manage__editor-title">
                  <span
                    className="rooms-manage__dot rooms-manage__dot--lg"
                    style={{ background: d.color }}
                  />
                  <div>
                    <h2>{d.name || 'ללא שם'}</h2>
                    <p className="rooms-manage__editor-slug">#{d.slug}</p>
                  </div>
                </div>
                <div className="rooms-manage__editor-quick">
                  <Link to={`/room/${selectedId}`} target="_blank" className="rooms-manage__link">
                    עמדה ↗
                  </Link>
                  <label className="rooms-manage__active-toggle">
                    <input
                      type="checkbox"
                      checked={!!d.is_active}
                      onChange={(e) =>
                        patchDraft(selectedId, { is_active: e.target.checked ? 1 : 0 })
                      }
                    />
                    פעיל
                  </label>
                </div>
              </div>

              <section className="rooms-manage__block">
                <h3 className="rooms-manage__section-title">פרטים</h3>
                <div className="rooms-manage__form-grid">
                  <label className="rooms-manage__field">
                    <span>שם במסך</span>
                    <input value={d.name} onChange={(e) => patchDraft(selectedId, { name: e.target.value })} />
                  </label>
                  <label className="rooms-manage__field">
                    <span>מספר חדר (הקראה)</span>
                    <input
                      value={d.room_number}
                      dir="ltr"
                      placeholder="ריק = לפי שם"
                      onChange={(e) => patchDraft(selectedId, { room_number: e.target.value })}
                    />
                  </label>
                  <label className="rooms-manage__field">
                    <span>סוג</span>
                    <select
                      value={d.type}
                      onChange={(e) => patchDraft(selectedId, { type: e.target.value })}
                    >
                      {TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="rooms-manage__field">
                    <span>סדר במסך</span>
                    <input
                      type="number"
                      min={0}
                      value={d.sort_order}
                      onChange={(e) =>
                        patchDraft(selectedId, { sort_order: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="rooms-manage__field">
                    <span>slug (מזהה)</span>
                    <input
                      value={d.slug}
                      dir="ltr"
                      onChange={(e) => patchDraft(selectedId, { slug: e.target.value })}
                    />
                  </label>
                  <label className="rooms-manage__field rooms-manage__field--color">
                    <span>צבע</span>
                    <input
                      type="color"
                      value={d.color}
                      onChange={(e) => patchDraft(selectedId, { color: e.target.value })}
                    />
                  </label>
                </div>
              </section>

              <section className="rooms-manage__block rooms-manage__block--queue">
                <h3 className="rooms-manage__section-title">תור</h3>
                <div className="rooms-manage__queue-modes">
                  <button
                    type="button"
                    className={`rooms-manage__mode-btn ${!isShared ? 'rooms-manage__mode-btn--on' : ''}`}
                    onClick={() => setSharedMode(selectedId, true)}
                  >
                    תור נפרד
                  </button>
                  <button
                    type="button"
                    className={`rooms-manage__mode-btn ${isShared ? 'rooms-manage__mode-btn--on' : ''}`}
                    onClick={() => setSharedMode(selectedId, false)}
                  >
                    תור משותף
                  </button>
                </div>

                {isShared && (
                  <div className="rooms-manage__shared">
                    <label className="rooms-manage__field">
                      <span>שם קבוצה</span>
                      <input
                        value={d.shared_group}
                        dir="ltr"
                        placeholder="doctors"
                        onChange={(e) => patchDraft(selectedId, { shared_group: e.target.value })}
                      />
                    </label>
                    <p className="rooms-manage__hint">חדרים מקושרים:</p>
                    <div className="rooms-manage__chips">
                      {others.length === 0 ? (
                        <span className="rooms-manage__hint">אין חדרים נוספים פעילים</span>
                      ) : (
                        others.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            className={`rooms-manage__chip ${d.linkedRoomIds.includes(o.id) ? 'rooms-manage__chip--on' : ''}`}
                            style={{ '--chip-color': o.color }}
                            onClick={() => toggleLink(selectedId, o.id)}
                          >
                            {d.linkedRoomIds.includes(o.id) ? '✓ ' : ''}
                            {o.name}
                          </button>
                        ))
                      )}
                    </div>
                    {partners?.length > 0 && (
                      <p className="rooms-manage__preview">
                        אחרי שמירה: {partners.join(' · ')}
                      </p>
                    )}
                  </div>
                )}
              </section>

              <footer className="rooms-manage__footer">
                <button type="button" className="btn-danger" onClick={() => removeRoom(selectedId)}>
                  מחק חדר
                </button>
                <button type="button" className="btn-primary" onClick={() => save(selectedId)}>
                  שמור שינויים
                </button>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
