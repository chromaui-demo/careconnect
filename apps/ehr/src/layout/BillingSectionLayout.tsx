import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@careconnect/design-system';
import { RequireRole } from '../components/RequireRole';
import { BILLING_VIEW_ROLES } from '../pages/billing/permissions';

const SUBNAV = [
  { id: 'claims', label: 'Claims', to: '/billing/claims' },
  { id: 'eras', label: 'ERAs', to: '/billing/eras' },
  { id: 'patients', label: 'Patients', to: '/billing/patients' },
  { id: 'ar', label: 'Patient AR', to: '/billing/patient-ar' },
  { id: 'masters', label: 'Master Data', to: '/billing/charge-masters' },
  { id: 'rules', label: 'Rules', to: '/billing/rules/claim-submission' },
];

export function BillingSectionLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const active = path.includes('/billing/eras') ? 'eras'
    : path.includes('/billing/patient-ar') ? 'ar'
    : path.includes('/billing/patients') ? 'patients'
    : /billing-providers|rendering-providers|service-facilities|charge-masters|tags/.test(path) ? 'masters'
    : path.includes('/billing/rules') ? 'rules'
    : 'claims';

  return (
    <RequireRole roles={BILLING_VIEW_ROLES}>
      <div style={{ display: 'flex', gap: 8, padding: '8px 24px', borderBottom: '1px solid var(--cc-border)', flexWrap: 'wrap' }}>
        {SUBNAV.map((s) => (
          <Button key={s.id} size="sm" variant={active === s.id ? 'primary' : 'ghost'} onClick={() => navigate(s.to)}>
            {s.label}
          </Button>
        ))}
      </div>
      <Outlet />
    </RequireRole>
  );
}
