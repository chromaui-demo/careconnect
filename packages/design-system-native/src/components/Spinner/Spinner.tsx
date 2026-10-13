import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useMotion } from '../../motion/MotionProvider';
import { colors } from '../../tokens/tokens';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  /** Accessible label; omit when a visible label sits next to the spinner. */
  label?: string;
}

const dimension: Record<SpinnerSize, { size: number; stroke: number }> = {
  sm: { size: 16, stroke: 2 },
  md: { size: 24, stroke: 3 },
  lg: { size: 40, stroke: 4 },
};

/**
 * A rotating arc. Unlike ActivityIndicator (a native view whose frames JS can't
 * control), it renders a fixed frame when motion is off — under
 * MotionProvider animate={false} or the OS "Reduce Motion" setting — so a
 * visual test captures the same pixels every run.
 */
export function Spinner({ size = 'md', color = colors.primary, label }: SpinnerProps) {
  const animate = useMotion();
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      rotation.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, rotation]);

  const { size: d, stroke } = dimension[size];
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['45deg', '405deg'] });

  return (
    <View
      accessible={!!label}
      accessibilityRole={label ? 'progressbar' : undefined}
      accessibilityLabel={label}
      style={{ width: d, height: d }}
    >
      <View style={[styles.ring, { width: d, height: d, borderRadius: d / 2, borderWidth: stroke, borderColor: color }]} />
      <Animated.View
        style={[
          styles.arc,
          { width: d, height: d, borderRadius: d / 2, borderWidth: stroke, borderTopColor: color, transform: [{ rotate }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', opacity: 0.2 },
  arc: { position: 'absolute', borderColor: 'transparent' },
});
