/**
 * @careconnect/design-system-native — React Native components for CareConnect.
 *
 * The native counterpart of @careconnect/design-system: same tokens, same
 * status vocabulary, components shaped for touch and small screens rather than
 * a one-to-one port of the web library.
 */
import packageJson from '../package.json';

export const DESIGN_SYSTEM_NATIVE_VERSION: string = packageJson.version;

export * from './tokens/tokens';
export { MotionProvider, useMotion, type MotionProviderProps } from './motion/MotionProvider';

export { Alert, type AlertProps, type AlertTone } from './components/Alert/Alert';
export { Avatar, initials, type AvatarProps, type AvatarSize } from './components/Avatar/Avatar';
export {
  Badge,
  appointmentStatusBadge,
  formatStatusLabel,
  type BadgeProps,
  type BadgeVariant,
} from './components/Badge/Badge';
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './components/Button/Button';
export { Card, type CardPadding, type CardProps, type CardTone } from './components/Card/Card';
export { ChipGroup, type ChipGroupProps } from './components/ChipGroup/ChipGroup';
export { EmptyState, type EmptyStateProps } from './components/EmptyState/EmptyState';
export { ListRow, type ListRowProps } from './components/ListRow/ListRow';
export { LoadingState, type LoadingStateProps } from './components/LoadingState/LoadingState';
export { MessageBubble, type MessageBubbleProps } from './components/MessageBubble/MessageBubble';
export { OptionCard, type OptionCardProps } from './components/OptionCard/OptionCard';
export { Screen, type ScreenProps } from './components/Screen/Screen';
export { SlotPicker, type Slot, type SlotPickerProps } from './components/SlotPicker/SlotPicker';
export { groupSlotsByDay, type SlotDay } from './components/SlotPicker/groupSlots';
export { Spinner, type SpinnerProps, type SpinnerSize } from './components/Spinner/Spinner';
export { StatCard, type StatCardProps } from './components/StatCard/StatCard';
export { StepProgress, type StepProgressProps } from './components/StepProgress/StepProgress';
export { Text, type TextProps, type TextTone, type TextVariant } from './components/Text/Text';
export { TextField, type TextFieldProps } from './components/TextField/TextField';
