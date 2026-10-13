import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Modal } from './Modal';
import { Button } from '../Button';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof Modal> = { title: 'Components/Modal', parameters: { design: figmaDesign('Components/Modal') }, component: Modal, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Modal>;

export const ConfirmDischarge: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal
          open={open}
          title="Discharge patient?"
          confirmLabel="Discharge"
          onConfirm={() => setOpen(false)}
          onClose={() => setOpen(false)}
        >
          This will finalize the encounter, generate AVS documents, and close the visit in the queue.
        </Modal>
      </>
    );
  },
};

// Interaction tests: run by `npm run test:stories` locally and by Chromatic on every build.
export const CancelThenReopen: Story = {
  ...ConfirmDischarge,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole('dialog', { name: 'Discharge patient?' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Open modal' }));
    await expect(canvas.getByRole('dialog', { name: 'Discharge patient?' })).toBeInTheDocument();
  },
};

export const CloseButtonDismisses: Story = {
  ...ConfirmDischarge,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};

export const ConfirmCallsHandler: Story = {
  args: {
    open: true,
    title: 'Discharge patient?',
    confirmLabel: 'Discharge',
    children: 'This will finalize the encounter, generate AVS documents, and close the visit in the queue.',
    onConfirm: fn(),
    onClose: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Discharge' }));
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
