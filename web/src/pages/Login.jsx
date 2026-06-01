import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/manage';

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(username, password);
      if (user.role === 'admin') navigate(from.startsWith('/manage') ? from : '/manage', { replace: true });
      else navigate('/manage/stations', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <form className="card" style={styles.form} onSubmit={submit}>
        <h1 style={styles.title}>התחברות</h1>
        <p style={styles.sub}>ניהול מערכת התורים — מורשים בלבד</p>
        <label style={styles.label}>שם משתמש</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <label style={styles.label}>סיסמה</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
          {loading ? 'מתחבר...' : 'כניסה'}
        </button>
        <Link to="/" style={styles.home}>
          חזרה לדף הבית
        </Link>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(160deg, #0f172a, #1e3a5f)',
    padding: '1rem',
  },
  form: { width: '100%', maxWidth: 400, padding: '2rem' },
  title: { fontSize: '1.75rem', marginBottom: '0.25rem' },
  sub: { color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.95rem' },
  label: { display: 'block', marginBottom: '0.35rem', marginTop: '0.75rem', fontSize: '0.9rem' },
  error: { color: '#f87171', marginTop: '0.75rem' },
  home: { display: 'block', textAlign: 'center', marginTop: '1rem', color: '#64748b' },
};
