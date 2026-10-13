import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Pagination } from './Pagination';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof Pagination> = { title: 'Components/Pagination', parameters: { design: figmaDesign('Components/Pagination') }, component: Pagination, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Pagination>;

export const ClaimsList: Story = {
  render: () => {
    const [page, setPage] = useState(2);
    return <Pagination page={page} totalPages={8} onPageChange={setPage} />;
  },
};

export const Disabled: Story = {
  render: () => <Pagination page={1} totalPages={8} onPageChange={() => {}} />,
};

export const Active: Story = {
  render: () => <Pagination page={4} totalPages={8} onPageChange={() => {}} />,
};

// Interaction test: Next reaches the last page.
export const NextToLastPage: Story = {
  render: () => {
    const [page, setPage] = useState(7);
    return <Pagination page={page} totalPages={8} onPageChange={setPage} />;
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await expect(canvas.getByRole('button', { name: '8' })).toHaveAttribute('aria-current', 'page');
  },
};
