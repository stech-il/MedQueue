import { useEffect, useState } from 'react';
import { api } from '../../api';

export default function ServicesManage() {
  const [services, setServices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ name: '', prefix: 'A', room_id: '' });

  const load = async () => {
    const [s, r] = await Promise.all([api.getServices(), api.getRoomsAll()]);
    setServices(s);
    setRooms(r);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    await api.createService({
      name: form.name,
      prefix: form.prefix,
      room_id: form.room_id ? Number(form.room_id) : null,
    });
    setForm({ name: '', prefix: 'A', room_id: '' });
    load();
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>שירותים וקידומות תור</h1>
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input placeholder="שם שירות" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="קידומת" value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} style={{ width: 80 }} dir="ltr" />
        <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
          <option value="">ללא חדר</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn-primary" onClick={add}>
          הוסף
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#1e293b' }}>
            <th style={th}>שם</th>
            <th style={th}>קידומת</th>
            <th style={th}>חדר</th>
            <th style={th}>פעיל</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id}>
              <td style={td}>{s.name}</td>
              <td style={td}>{s.prefix}</td>
              <td style={td}>{s.room_name || '—'}</td>
              <td style={td}>{s.is_active ? 'כן' : 'לא'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: '0.65rem', textAlign: 'right' };
const td = { padding: '0.65rem', borderTop: '1px solid #334155' };
