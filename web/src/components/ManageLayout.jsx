import { useState } from 'react';

import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import { ManageThemeProvider, useManageTheme } from '../context/ManageThemeContext';

import ChangePasswordModal from './ChangePasswordModal';

import { setSession, getToken } from '../lib/authStore';

import '../styles/manage-theme.css';



const nav = [

  { to: '/manage', end: true, label: 'לוח בקרה', admin: true },

  { to: '/manage/reports', label: 'דוחות וסטטיסטיקה', admin: true },

  { to: '/manage/rooms', label: 'חדרים', admin: true },

  { to: '/manage/users', label: 'משתמשי ניהול', admin: true },

  { to: '/manage/status', label: 'סטטוס מערכת', admin: true },

  { to: '/manage/settings', label: 'הגדרות מרפאה', admin: true },

  { to: '/manage/services', label: 'שירותים', admin: true },

  { to: '/manage/stations', label: 'עמדות חדר' },

];



function ManageLayoutInner() {

  const { user, logout, isAdmin, refresh } = useAuth();

  const navigate = useNavigate();

  const { theme, toggleTheme, isDark } = useManageTheme();

  const [pwDone, setPwDone] = useState(false);

  const mustChange = isAdmin && user?.must_change_password && !pwDone;



  const onPasswordChanged = (u) => {

    setSession(getToken(), u);

    setPwDone(true);

    refresh();

  };



  return (

    <div className="manage-app" data-manage-theme={theme}>

      {mustChange && <ChangePasswordModal onDone={onPasswordChanged} />}

      <aside className="manage-app__sidebar">

        <div className="manage-app__brand">

          <span>🏥</span> MedQueue

        </div>

        <p className="manage-app__user">

          {user?.display_name || user?.username}

          <span className="manage-app__role">{isAdmin ? 'מנהל' : 'צוות'}</span>

        </p>

        <nav className="manage-app__nav">

          {nav

            .filter((n) => !n.admin || isAdmin)

            .map((n) => (

              <NavLink

                key={n.to}

                to={n.to}

                end={n.end}

                className={({ isActive }) =>

                  `manage-app__link${isActive ? ' manage-app__link--active' : ''}`

                }

              >

                {n.label}

              </NavLink>

            ))}

        </nav>

        <div className="manage-app__external">

          <a href="/kiosk" target="_blank" rel="noreferrer" className="manage-app__ext-link">

            קיוסק ↗

          </a>

          <a href="/display" target="_blank" rel="noreferrer" className="manage-app__ext-link">

            מסך ראשי ↗

          </a>

        </div>

        <button type="button" className="manage-app__theme-toggle" onClick={toggleTheme}>

          {isDark ? '☀️ מצב יום' : '🌙 מצב לילה'}

        </button>

        <button

          type="button"

          className="manage-app__logout"

          onClick={() => {

            logout();

            navigate('/login');

          }}

        >

          התנתק

        </button>

        <p className="manage-credit">פותח ע&quot;י שיטכנולוגיות 2026</p>

      </aside>

      <main className="manage-app__main">

        <Outlet />

      </main>

    </div>

  );

}



export default function ManageLayout() {

  return (

    <ManageThemeProvider>

      <ManageLayoutInner />

    </ManageThemeProvider>

  );

}


