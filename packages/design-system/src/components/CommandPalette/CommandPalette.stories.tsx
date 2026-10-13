import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Button } from '../Button';
import { CommandPalette, sampleCommandItems } from './CommandPalette';
import { figmaDesign } from '../../figma/links';

const meta: Meta = { title: 'Components/CommandPalette', parameters: { design: figmaDesign('Components/CommandPalette') }, tags: ['autodocs'] };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open command palette (⌘K)</Button>
        <CommandPalette
          open={open}
          onClose={() => setOpen(false)}
          items={sampleCommandItems}
          footer="↑↓ navigate · Enter select · Esc close"
        />
      </>
    );
  },
};

export const Hover: Story = {
  render: () => (
    <CommandPalette
      open
      onClose={() => {}}
      items={sampleCommandItems}
      footer="↑↓ navigate · Enter select · Esc close"
    />
  ),
  parameters: { pseudo: { hover: '.cc-command-palette__item' } },
};

// CommandPalette's :focus pseudo-class rule (see CommandPalette.css) only suppresses
// the browser's default outline and adds no visible focus treatment, so this story
// renders identically to Active below — it documents the focused-input state.
export const Focus: Story = {
  render: () => (
    <CommandPalette
      open
      onClose={() => {}}
      items={sampleCommandItems}
      footer="↑↓ navigate · Enter select · Esc close"
    />
  ),
  parameters: { pseudo: { focus: '.cc-command-palette__input' } },
};

export const Active: Story = {
  render: () => (
    <CommandPalette
      open
      onClose={() => {}}
      items={sampleCommandItems}
      footer="↑↓ navigate · Enter select · Esc close"
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <CommandPalette
      open
      onClose={() => {}}
      items={[]}
      footer="↑↓ navigate · Enter select · Esc close"
    />
  ),
};

// Interaction tests: run by `npm run test:stories` locally and by Chromatic on every build.
function PaletteWithSpies({ onSelect }: { onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  const items = sampleCommandItems.map((item) => ({ ...item, onSelect: () => onSelect(item.id) }));
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open command palette (⌘K)</Button>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        footer="↑↓ navigate · Enter select · Esc close"
      />
    </>
  );
}

type SpyStory = StoryObj<{ onSelect: (id: string) => void }>;

export const FiltersAndSelectsWithKeyboard: SpyStory = {
  args: { onSelect: fn() },
  render: (args) => <PaletteWithSpies onSelect={args.onSelect} />,
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByPlaceholderText('Search patients, actions, pages…'), 'go to');
    await expect(canvas.getAllByRole('button', { name: /^Go to/ })).toHaveLength(2);
    await expect(canvas.queryByRole('button', { name: 'Check in walk-in patient' })).not.toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(args.onSelect).toHaveBeenCalledOnce();
    await expect(args.onSelect).toHaveBeenCalledWith('4');
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};

export const EscapeClosesAndResetsQuery: SpyStory = {
  args: { onSelect: fn() },
  render: (args) => <PaletteWithSpies onSelect={args.onSelect} />,
  play: async ({ args, canvas, userEvent }) => {
    const search = canvas.getByPlaceholderText('Search patients, actions, pages…');
    await userEvent.type(search, 'zzz');
    await expect(canvas.getByText('No matches')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /Open command palette/ }));
    await expect(canvas.getByPlaceholderText('Search patients, actions, pages…')).toHaveValue('');
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};
