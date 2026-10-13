import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { FileUpload } from './FileUpload';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof FileUpload> = { title: 'Components/FileUpload', parameters: { design: figmaDesign('Components/FileUpload') }, component: FileUpload, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof FileUpload>;

export const InsuranceCard: Story = {
  args: {
    label: 'Upload insurance card',
    hint: 'PNG or PDF, max 10 MB',
    accept: 'image/*,.pdf',
  },
};

export const Hover: Story = {
  args: {
    label: 'Upload insurance card',
    hint: 'PNG or PDF, max 10 MB',
    accept: 'image/*,.pdf',
  },
  parameters: { pseudo: { hover: '.cc-file-upload__dropzone' } },
};

// FileUpload's drag-over state (`dragOver` internal state, not a prop) shares its
// CSS rule with :hover (see FileUpload.css:12), so this renders identically to
// Hover above — it documents the drag-active state, which has no external prop hook.
export const Active: Story = {
  args: {
    label: 'Upload insurance card',
    hint: 'Drop to upload',
    accept: 'image/*,.pdf',
  },
  parameters: { pseudo: { hover: '.cc-file-upload__dropzone' } },
};

// Interaction tests: run by `npm run test:stories` locally and by Chromatic on every build.
const insuranceCard = () => new File([new Uint8Array(2048)], 'insurance-card.png', { type: 'image/png' });

export const SelectsAFile: Story = {
  args: { ...InsuranceCard.args, onFilesSelected: fn() },
  play: async ({ args, canvas, canvasElement, userEvent }) => {
    const file = insuranceCard();
    await userEvent.upload(canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!, file);
    await expect(args.onFilesSelected).toHaveBeenCalledOnce();
    await expect(args.onFilesSelected).toHaveBeenCalledWith([file]);
    await expect(canvas.getByText('insurance-card.png (2 KB)')).toBeInTheDocument();
  },
};

export const ClearsSelection: Story = {
  args: { ...InsuranceCard.args },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.upload(canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!, insuranceCard());
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await expect(canvas.queryByText('insurance-card.png (2 KB)')).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  },
};
