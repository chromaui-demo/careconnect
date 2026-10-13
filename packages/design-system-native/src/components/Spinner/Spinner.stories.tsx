import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { MotionProvider } from '../../motion/MotionProvider';
import { colors } from '../../tokens/tokens';
import { Spinner } from './Spinner';

const meta = {
  title: 'Components/Spinner',
  component: Spinner,
  args: { label: 'Loading' },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

// Under Chromatic the global decorator turns motion off, so these capture the
// spinner's fixed frame. On device they spin.
export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </View>
  ),
};

export const OnBrand: Story = {
  render: () => (
    <View style={{ padding: 16, backgroundColor: colors.primary, alignSelf: 'flex-start', borderRadius: 8 }}>
      <Spinner color={colors.textInverse} />
    </View>
  ),
};

/** The frame every reduced-motion user and every Chromatic capture sees. */
export const ReducedMotion: Story = {
  render: (args) => (
    <MotionProvider animate={false}>
      <Spinner {...args} size="lg" />
    </MotionProvider>
  ),
};
