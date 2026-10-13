import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  CareConnectLogo,
  CommandPalette,
  Navbar,
  type NavItem,
  type CommandItem,
} from '@careconnect/design-system';
import { useAuth } from '../context/AuthContext';
import { useHasRole } from '../components/RequireRole';
import { BILLING_VIEW_ROLES } from '../pages/billing/permissions';

const navItems: NavItem[] = [
  { id: 'tracking-board', label: 'Tracking Board' },
  { id: 'patients', label: 'Patients' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'fax', label: 'Fax' },
  { id: 'labs-inbox', label: 'Lab Inbox' },
  { id: 'admin', label: 'Admin' },
  { id: 'billing', label: 'Billing' },
  { id: 'reports', label: 'Reports' },
];

const routeMap: Record<string, string> = {
  'tracking-board': '/visits',
  patients: '/patients',
  tasks: '/tasks',
  fax: '/fax',
  'labs-inbox': '/labs-inbox',
  admin: '/admin',
  billing: '/billing/claims',
  reports: '/reports',
};

const pathToNav: Record<string, string> = Object.fromEntries(
  Object.entries(routeMap).map(([k, v]) => [v, k]),
);

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const canViewBilling = useHasRole(BILLING_VIEW_ROLES);
  const visibleNavItems = useMemo(
    () => navItems.filter((i) => i.id !== 'billing' || canViewBilling),
    [canViewBilling],
  );

  const activeNav = pathToNav[location.pathname.split('/').slice(0, 2).join('/') || '/visits']
    ?? (location.pathname.startsWith('/patient') ? 'patients'
      : location.pathname.startsWith('/admin') ? 'admin'
      : location.pathname.startsWith('/billing') ? 'billing'
      : location.pathname.startsWith('/fax') ? 'fax'
      : location.pathname.startsWith('/labs') ? 'labs-inbox'
      : location.pathname.startsWith('/visit') ? 'tracking-board'
      : 'tracking-board');

  const commandItems: CommandItem[] = useMemo(() => [
    { id: 'visits', label: 'Tracking Board', group: 'Navigate', onSelect: () => navigate('/visits') },
    { id: 'patients', label: 'Patients', group: 'Navigate', onSelect: () => navigate('/patients') },
    { id: 'tasks', label: 'Tasks', group: 'Navigate', onSelect: () => navigate('/tasks') },
    { id: 'fax', label: 'Fax', group: 'Navigate', onSelect: () => navigate('/fax') },
    { id: 'labs', label: 'Lab Inbox', group: 'Navigate', onSelect: () => navigate('/labs-inbox') },
    { id: 'reports', label: 'Reports', group: 'Navigate', onSelect: () => navigate('/reports') },
    { id: 'admin', label: 'Administration', group: 'Navigate', onSelect: () => navigate('/admin') },
    ...(canViewBilling ? [{ id: 'billing', label: 'Billing', group: 'Navigate', onSelect: () => navigate('/billing/claims') }] : []),
    { id: 'add-visit', label: 'Add walk-in visit', group: 'Actions', onSelect: () => navigate('/visits/add') },
  ], [navigate, canViewBilling]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleNavigate = (id: string) => {
    navigate(routeMap[id] ?? '/visits');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cc-bg)' }}>
      <Navbar
        logo={<CareConnectLogo />}
        domain="se-tools.net"
        items={visibleNavItems}
        activeItem={activeNav}
        onNavigate={handleNavigate}
        userMenu={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button size="sm" variant="ghost" onClick={() => setPaletteOpen(true)}>⌘K</Button>
            <span style={{ fontSize: 'var(--cc-text-sm)', color: 'var(--cc-text-secondary)' }}>
              {user?.firstName} {user?.lastName}
            </span>
            <Avatar name={`${user?.firstName} ${user?.lastName}`} size="sm" />
            <Button size="sm" variant="ghost" onClick={() => { logout(); navigate('/login'); }}>Logout</Button>
          </div>
        }
      />
      <Outlet />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={commandItems} />
    </div>
  );
}
