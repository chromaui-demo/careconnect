import { takeSnapshot } from '@chromatic-com/vitest';
import { beforeEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Badge } from '../Badge';
import { DataGrid } from './DataGrid';

interface ClaimRow {
  id: string;
  patient: string;
  payer: string;
  amount: number;
  status: 'submitted' | 'paid' | 'denied';
}

const claims: ClaimRow[] = [
  { id: 'CLM-9012', patient: 'Alice Smith', payer: 'Aetna', amount: 420, status: 'submitted' },
  { id: 'CLM-9013', patient: 'Bob Johnson', payer: 'Medicare', amount: 890, status: 'paid' },
  { id: 'CLM-9014', patient: 'Charlie Williams', payer: 'Medicaid', amount: 210, status: 'denied' },
  { id: 'CLM-9015', patient: 'Diana Lee', payer: 'UHC', amount: 560, status: 'submitted' },
];

function ClaimsGrid() {
  return (
    <DataGrid<ClaimRow>
      rows={claims}
      rowKey={(r) => r.id}
      searchFilter={(row, q) =>
        row.patient.toLowerCase().includes(q) || row.payer.toLowerCase().includes(q) || row.id.toLowerCase().includes(q)
      }
      searchPlaceholder="Search claims, patients, payers…"
      columns={[
        { id: 'id', header: 'Claim', accessor: (r) => r.id, sortValue: (r) => r.id },
        { id: 'patient', header: 'Patient', accessor: (r) => r.patient, sortValue: (r) => r.patient },
        { id: 'payer', header: 'Payer', accessor: (r) => r.payer, sortValue: (r) => r.payer },
        { id: 'amount', header: 'Amount', accessor: (r) => `$${r.amount.toFixed(2)}`, sortValue: (r) => r.amount },
        {
          id: 'status',
          header: 'Status',
          accessor: (r) => (
            <Badge variant={r.status === 'paid' ? 'success' : r.status === 'denied' ? 'error' : 'info'}>{r.status}</Badge>
          ),
        },
      ]}
    />
  );
}

beforeEach(async () => {
  await page.viewport(1280, 800);
});

// One test walks a biller's whole session. Every takeSnapshot() becomes its own
// snapshot in Chromatic, and the end-of-test capture records the final state —
// so a regression in any intermediate state shows up, not just the first paint.
test('claims worklist: sort, search, and empty state', async () => {
  const screen = await render(<ClaimsGrid />);
  await takeSnapshot('unsorted');

  const amount = screen.getByText(/^Amount/);
  await amount.click();
  await amount.click();
  await expect.element(screen.getByRole('row').nth(1)).toHaveTextContent('Bob Johnson');
  await expect.element(screen.getByRole('row').nth(4)).toHaveTextContent('Charlie Williams');
  await takeSnapshot('sorted by amount, descending');

  const search = screen.getByPlaceholder('Search claims, patients, payers…');
  await search.fill('medic');
  await expect.element(screen.getByText('2 rows')).toBeVisible();
  await takeSnapshot('filtered to Medicare and Medicaid');

  await search.fill('no such payer');
  await expect.element(screen.getByText('No rows match your filters.')).toBeVisible();
});
