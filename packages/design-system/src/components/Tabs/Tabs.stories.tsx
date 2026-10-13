import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';
import { TabPanel, Tabs } from './Tabs';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  parameters: { design: figmaDesign('Components/Tabs') },
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const AppointmentTabs: Story = {
  render: () => {
    const [active, setActive] = useState('in-office');
    const tabs = [
      { id: 'prebooked', label: 'Prebooked', count: 3 },
      { id: 'in-office', label: 'In Office', count: 4 },
      { id: 'completed', label: 'Completed', count: 3 },
      { id: 'cancelled', label: 'Cancelled', count: 1 },
    ];
    return (
      <div>
        <Tabs tabs={tabs} activeTab={active} onChange={setActive} />
        <TabPanel active={true} style={{ padding: '16px 0' }}>
          Showing {active} appointments
        </TabPanel>
      </div>
    );
  },
};

// Interaction test: clicking a tab selects it and swaps the panel.
export const SwitchesOnClick: Story = {
  ...AppointmentTabs,
  play: async ({ canvas, userEvent }) => {
    const completed = canvas.getByRole('tab', { name: /Completed/ });
    await userEvent.click(completed);
    await expect(completed).toHaveAttribute('aria-selected', 'true');
    await expect(canvas.getByText('Showing completed appointments')).toBeInTheDocument();
  },
};

export const Pills: Story = {
  render: () => {
    const [active, setActive] = useState('vitals');
    return (
      <Tabs
        variant="pills"
        tabs={[
          { id: 'vitals', label: 'Vitals' },
          { id: 'allergies', label: 'Allergies' },
          { id: 'medications', label: 'Medications' },
        ]}
        activeTab={active}
        onChange={setActive}
      />
    );
  },
};

export const Hover: Story = {
  render: () => {
    const tabs = [
      { id: 'prebooked', label: 'Prebooked', count: 3 },
      { id: 'in-office', label: 'In Office', count: 4 },
      { id: 'completed', label: 'Completed', count: 3 },
    ];
    return <Tabs tabs={tabs} activeTab="in-office" onChange={() => {}} />;
  },
  parameters: { pseudo: { hover: '.cc-tabs__tab' } },
};

export const Active: Story = {
  render: () => {
    const tabs = [
      { id: 'prebooked', label: 'Prebooked', count: 3 },
      { id: 'in-office', label: 'In Office', count: 4 },
      { id: 'completed', label: 'Completed', count: 3 },
    ];
    return <Tabs tabs={tabs} activeTab="completed" onChange={() => {}} />;
  },
};
