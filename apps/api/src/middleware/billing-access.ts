import { requireRoles } from './auth.js';

/** View tier: read-only access to billing data. */
export const billingViewGuard = requireRoles('Administrator', 'Billing', 'Manager');

/** Write tier: create/update/delete billing data. */
export const billingWriteGuard = requireRoles('Administrator', 'Billing');
