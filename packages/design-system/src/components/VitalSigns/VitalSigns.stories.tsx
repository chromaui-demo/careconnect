import type { Meta, StoryObj } from '@storybook/react-vite';
import { VitalSigns } from './VitalSigns';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof VitalSigns> = { title: 'Clinical/VitalSigns', parameters: { design: figmaDesign('Clinical/VitalSigns') }, component: VitalSigns, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof VitalSigns>;

export const TriagePanel: Story = {
  args: {
    // Show when the panel renders, like the live triage screen.
    recordedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    readings: [
      { label: 'BP', value: '128/82', unit: 'mmHg' },
      { label: 'HR', value: '88', unit: 'bpm', status: 'warning' },
      { label: 'Temp', value: '98.4', unit: '°F' },
      { label: 'SpO₂', value: '97', unit: '%' },
      { label: 'RR', value: '16', unit: '/min' },
      { label: 'Weight', value: '162', unit: 'lb' },
    ],
  },
};
