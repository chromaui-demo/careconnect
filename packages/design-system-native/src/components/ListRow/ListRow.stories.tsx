import type { Meta, StoryObj } from '@storybook/react-native';
import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { Card } from '../Card/Card';
import { ListRow } from './ListRow';

const meta = {
  title: 'Components/ListRow',
  component: ListRow,
  args: { title: 'Annual physical', subtitle: 'Dr. Raj Patel · Main Clinic', overline: 'TUE, OCT 14 · 9:30 AM' },
  decorators: [(Story) => <Card padding="none"><Story /></Card>],
} satisfies Meta<typeof ListRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = { args: { last: true } };
export const Pressable: Story = { args: { onPress: () => {}, last: true } };
export const WithBadge: Story = {
  args: { onPress: () => {}, last: true, trailing: <Badge variant="prebooked" dot>Prebooked</Badge> },
};
export const WithAvatar: Story = {
  args: {
    title: 'Lab results follow-up',
    subtitle: 'Your A1C came back in range. No changes needed to your…',
    overline: undefined,
    leading: <Avatar name="Raj Patel" size="sm" />,
    trailing: <Badge variant="info">2 new</Badge>,
    onPress: () => {},
    last: true,
  },
};
