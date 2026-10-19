import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { PatientBanner } from './PatientBanner';
import { Button } from '../Button';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof PatientBanner> = { title: 'Clinical/PatientBanner', parameters: { design: figmaDesign('Clinical/PatientBanner') }, component: PatientBanner, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof PatientBanner>;

export const ActiveEncounter: Story = {
  args: {
    name: 'Alice Smith',
    mrn: 'MRN-10482',
    dob: '03/14/1985',
    age: 41,
    sex: 'Female',
    status: 'in-office',
    allergies: [
      { substance: 'Latex', reaction: 'skin rash', severity: 'mild' },
      { substance: 'Penicillin', reaction: 'anaphylaxis', severity: 'severe' },
      { substance: 'Sulfa drugs', reaction: 'hives', severity: 'moderate' },
    ],
    alerts: ['Fall risk'],
    actions: (
      <>
        <Button variant="secondary" size="sm">Message</Button>
        <Button size="sm">Open encounter</Button>
      </>
    ),
  },
  // Severe allergies lead, whatever order the record lists them in.
  play: async ({ canvasElement }) => {
    const chips = canvasElement.querySelectorAll('.cc-patient-banner__alerts > span');
    await expect(chips[0]).toHaveTextContent('Severe · Penicillin — anaphylaxis');
    await expect(chips[0]).toHaveClass('cc-patient-banner__alert');
  },
};
