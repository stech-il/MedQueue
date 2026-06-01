import { useEffect, useState } from 'react';
import { api } from '../../api';

export default function UsersManage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'admin',
  });
  const [msg, setMsg] = useState('');

  const load = async () => {
    setUsers(await api.getUsers());
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      await api.createUser(form);
      setForm({ username: '', password: '', display_name: '', role: 'admin' });
      setMsg('משתמש נוסף');
      load();
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const deactivate = async (id) => {
    if (!confirm('לבטל משתמש זה?')) return;
    await api.updateUser(id, { is_active: 0 });
    setMsg('המשתמש בוטל');
    load();
    setTimeout(() => setMsg(''), 2500);
  };

  const resetPass = async (id) => {
    const p = prompt('סיסמה חדשה:');
    if (!p) return;
    await api.updateUser(id, { password: p });
    setMsg('הסיסמה עודכנה');
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <div className="users-manage">
      <h1 className="users-manage__title">משתמשי ניהול</h1>
      <p className="users-manage__sub">
        התחברות לממשק הניהול בלבד. עמדות חדר (<code>/room</code>) פתוחות לכולם — בלי שיוך חדרים למשתמש.
      </p>
      {msg && <p className="users-manage__msg">{msg}</p>}

      <div className="card users-manage__card">
        <h2 className="users-manage__card-title">הוספת משתמש</h2>
        <div className="users-manage__grid">
          <label className="users-manage__field">
            <span>שם משתמש</span>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="off"
            />
          </label>
          <label className="users-manage__field">
            <span>סיסמה</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
            />
          </label>
          <label className="users-manage__field">
            <span>שם תצוגה</span>
            <input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </label>
          <label className="users-manage__field">
            <span>תפקיד</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">מנהל מערכת — דוחות, הגדרות, חדרים</option>
              <option value="staff">צוות — קישור לעמדות חדר בממשק ניהול</option>
            </select>
          </label>
        </div>
        <button type="button" className="btn-primary users-manage__submit" onClick={create}>
          הוסף משתמש
        </button>
      </div>

      <div className="users-manage__table-wrap">
        <table className="report-table users-manage__table">
          <thead>
            <tr>
              <th>שם</th>
              <th>תפקיד</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.display_name || u.username}</strong>
                  <span className="users-manage__username"> ({u.username})</span>
                </td>
                <td>{u.role === 'admin' ? 'מנהל מערכת' : 'צוות'}</td>
                <td>{u.is_active ? 'פעיל' : 'מבוטל'}</td>
                <td className="users-manage__actions">
                  {u.is_active ? (
                    <>
                      <button type="button" className="btn-ghost" onClick={() => resetPass(u.id)}>
                        איפוס סיסמה
                      </button>
                      {u.username !== 'admin' && (
                        <button type="button" className="btn-danger" onClick={() => deactivate(u.id)}>
                          הסר משתמש
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="users-manage__muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
