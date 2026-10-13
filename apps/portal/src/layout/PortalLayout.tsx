import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { api } from '@careconnect/api-client';
import { Avatar, Badge, Button, CareConnectLogo } from '@careconnect/design-system';
import { useAuth } from '../context/AuthContext';
import './PortalLayout.css';

const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/visits', label: 'Visits' },
  { to: '/medications', label: 'Medications' },
  { to: '/results', label: 'Results' },
  { to: '/messages', label: 'Messages' },
  { to: '/bills', label: 'Bills' },
];

export function PortalLayout() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.portal.getMessagesUnreadCount()
      .then((r) => setUnread(r.count))
      .catch(() => setUnread(0));
  }, []);

  return (
    <div className="portal-layout">
      <header className="portal-header">
        <Link to="/" className="portal-header__brand">
          <CareConnectLogo />
        </Link>
        <span className="portal-header__domain">se-tools.net</span>
        <nav className="portal-nav" aria-label="Patient portal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `portal-nav__link${isActive ? ' portal-nav__link--active' : ''}`}
            >
              {item.label}
              {item.to === '/messages' && unread > 0 && (
                <Badge variant="info" className="portal-nav__badge">{unread}</Badge>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="portal-header__user">
          {user && (
            <>
              <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
              <span className="portal-header__name">{user.firstName} {user.lastName}</span>
              <Button size="sm" variant="ghost" onClick={logout}>Sign out</Button>
            </>
          )}
        </div>
      </header>
      <main className="portal-main">
        <Outlet />
      </main>
      <footer className="portal-footer">
        <p>&copy; {new Date().getFullYear()} CareConnect · se-tools.net · Demo Environment</p>
      </footer>
    </div>
  );
}
