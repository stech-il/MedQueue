import { useState } from 'react';
import { api } from '../api';

export default function ChangePasswordModal({ onDone }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next !== confirm) {
      setError('אימות הסיסמה אינו תואם');
      return;
    }
    if (next.length < 6) {
      setError('לפחות 6 תווים');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user } = await api.changePassword(current, next);
      onDone(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pw-modal-backdrop" role="dialog" aria-modal="true">
      <form className="pw-modal card" onSubmit={submit}>
        <h2 className="pw-modal__title">החלפת סיסמה נדרשת</h2>
        <p className="pw-modal__sub">
          זו כניסה ראשונה עם סיסמת ברירת מחדל. בחרו סיסמה חדשה לחשבון המנהל.
        </p>
        <label className="pw-modal__label">
          סיסמה נוכחית
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label className="pw-modal__label">
          סיסמה חדשה
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <label className="pw-modal__label">
          אימות סיסמה
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>
        {error && <p className="pw-modal__error">{error}</p>}
        <button type="submit" className="btn-primary pw-modal__submit" disabled={loading}>
          {loading ? 'שומר…' : 'שמור והמשך'}
        </button>
      </form>
    </div>
  );
}
