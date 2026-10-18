import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { DataGrid } from './DataGrid';
import { figmaDesign } from '../../figma/links';

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

const meta: Meta<typeof DataGrid> = {
  title: 'Components/DataGrid',
  parameters: { design: figmaDesign('Components/DataGrid') },
  component: DataGrid,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DataGrid>;

export const ClaimsList: Story = {
  render: () => (
    <DataGrid<ClaimRow>
      rows={claims}
      rowKey={(r) => r.id}
      searchFilter={(row, q) =>
        row.patient.toLowerCase().includes(q) ||
        row.payer.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q)
      }
      searchPlaceholder="Search claims, patients, payers…"
      columns={[
        { id: 'id', header: 'Claim', accessor: (r) => r.id, sortValue: (r) => r.id },
        { id: 'patient', header: 'Patient', accessor: (r) => r.patient, sortValue: (r) => r.patient },
        { id: 'payer', header: 'Payer', accessor: (r) => r.payer, sortValue: (r) => r.payer },
        {
          id: 'amount',
          header: 'Amount',
          accessor: (r) => `$${r.amount.toFixed(2)}`,
          sortValue: (r) => r.amount,
        },
        {
          id: 'status',
          header: 'Status',
          accessor: (r) => (
            <Badge variant={r.status === 'paid' ? 'success' : r.status === 'denied' ? 'error' : 'info'}>
              {r.status}
            </Badge>
          ),
          sortValue: (r) => r.status,
        },
        {
          id: 'actions',
          header: 'Actions',
          hideHeader: true,
          accessor: () => <Button size="sm" variant="ghost">View</Button>,
        },
      ]}
    />
  ),
};

export const Hover: Story = {
  render: () => (
    <DataGrid<ClaimRow>
      rows={claims}
      rowKey={(r) => r.id}
      onRowClick={() => {}}
      columns={[
        { id: 'id', header: 'Claim', accessor: (r) => r.id, sortValue: (r) => r.id },
        { id: 'patient', header: 'Patient', accessor: (r) => r.patient, sortValue: (r) => r.patient },
        { id: 'payer', header: 'Payer', accessor: (r) => r.payer, sortValue: (r) => r.payer },
        {
          id: 'status',
          header: 'Status',
          accessor: (r) => (
            <Badge variant={r.status === 'paid' ? 'success' : r.status === 'denied' ? 'error' : 'info'}>
              {r.status}
            </Badge>
          ),
          sortValue: (r) => r.status,
        },
      ]}
    />
  ),
  parameters: { pseudo: { hover: '.cc-data-grid__row--clickable' } },
};

export const Empty: Story = {
  render: () => (
    <DataGrid<ClaimRow>
      rows={[]}
      rowKey={(r) => r.id}
      searchFilter={(row, q) =>
        row.patient.toLowerCase().includes(q) ||
        row.payer.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q)
      }
      searchPlaceholder="Search claims, patients, payers…"
      columns={[
        { id: 'id', header: 'Claim', accessor: (r) => r.id },
        { id: 'patient', header: 'Patient', accessor: (r) => r.patient },
        { id: 'payer', header: 'Payer', accessor: (r) => r.payer },
      ]}
    />
  ),
};

// Interaction tests: run by `npm run test:stories` locally and by Chromatic on every build.
export const SearchFiltersRows: Story = {
  ...ClaimsList,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('4 rows')).toBeInTheDocument();
    await userEvent.type(canvas.getByPlaceholderText('Search claims, patients, payers…'), 'medicare');
    await expect(canvas.getByText('1 rows')).toBeInTheDocument();
    await expect(canvas.getByRole('cell', { name: 'Bob Johnson' })).toBeInTheDocument();
    await expect(canvas.queryByRole('cell', { name: 'Alice Smith' })).not.toBeInTheDocument();
  },
};

export const SearchWithNoMatches: Story = {
  ...ClaimsList,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByPlaceholderText('Search claims, patients, payers…'), 'cigna');
    await expect(canvas.getByText('0 rows')).toBeInTheDocument();
    await expect(canvas.getByText('No rows match your filters.')).toBeInTheDocument();
  },
};

export const SortsByAmount: Story = {
  ...ClaimsList,
  play: async ({ canvas, userEvent }) => {
    const amount = canvas.getByRole('columnheader', { name: 'Amount' });
    const firstPatient = () => within(canvas.getAllByRole('row')[1]).getAllByRole('cell')[1];

    await userEvent.click(amount);
    await expect(amount).toHaveAttribute('aria-sort', 'ascending');
    await expect(firstPatient()).toHaveTextContent('Charlie Williams');

    await userEvent.click(amount);
    await expect(amount).toHaveAttribute('aria-sort', 'descending');
    await expect(firstPatient()).toHaveTextContent('Bob Johnson');
  },
};

// Different digit lengths distinguish numeric order from alphabetical order.
// Keep the existing search fixtures unchanged.
const mixedAmountClaims: ClaimRow[] = [
  claims[0],
  { id: 'CLM-9016', patient: 'Evelyn Park', payer: 'Aetna', amount: 1200, status: 'submitted' },
  claims[1],
  claims[2],
  claims[3],
];

export const MixedClaimAmounts: Story = {
  render: () => (
    <DataGrid<ClaimRow>
      rows={mixedAmountClaims}
      rowKey={(row) => row.id}
      columns={[
        { id: 'id', header: 'Claim', accessor: (row) => row.id },
        { id: 'patient', header: 'Patient', accessor: (row) => row.patient },
        {
          id: 'amount',
          header: 'Amount',
          accessor: (row) => `$${row.amount.toFixed(2)}`,
          sortValue: (row) => row.amount,
        },
      ]}
    />
  ),
};

export const SortsMixedAmountsAscending: Story = {
  ...MixedClaimAmounts,
  play: async ({ canvas, userEvent, step }) => {
    await step('Sort smallest to largest and verify every claim', async () => {
      const amount = canvas.getByRole('columnheader', { name: 'Amount' });
      await userEvent.click(amount);
      await expect(amount).toHaveAttribute('aria-sort', 'ascending');
      const claimOrder = canvas.getAllByRole('row').slice(1)
        .map((row) => within(row).getAllByRole('cell')[0].textContent);
      await expect(claimOrder).toEqual(['CLM-9014', 'CLM-9012', 'CLM-9015', 'CLM-9013', 'CLM-9016']);
    });
  },
};

export const SortsMixedAmountsDescending: Story = {
  ...MixedClaimAmounts,
  play: async ({ canvas, userEvent, step }) => {
    const amount = canvas.getByRole('columnheader', { name: 'Amount' });
    await step('Select descending order', async () => {
      await userEvent.click(amount);
      await userEvent.click(amount);
    });
    await step('Verify largest to smallest for every claim', async () => {
      await expect(amount).toHaveAttribute('aria-sort', 'descending');
      const claimOrder = canvas.getAllByRole('row').slice(1)
        .map((row) => within(row).getAllByRole('cell')[0].textContent);
      await expect(claimOrder).toEqual(['CLM-9016', 'CLM-9013', 'CLM-9015', 'CLM-9012', 'CLM-9014']);
    });
  },
};
