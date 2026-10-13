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
