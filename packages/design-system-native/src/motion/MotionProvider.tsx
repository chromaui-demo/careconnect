import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

const MotionContext = createContext<boolean | undefined>(undefined);

export interface MotionProviderProps {
  /**
   * Force animations off (`false`) or on (`true`). Leave unset to follow the
   * OS "Reduce Motion" setting. Storybook sets `false` for Chromatic captures,
   * so animated components render one deterministic frame instead of
   * whatever frame the capture happens to land on.
   */
  animate?: boolean;
  children: ReactNode;
}

export function MotionProvider({ animate, children }: MotionProviderProps) {
  return <MotionContext.Provider value={animate}>{children}</MotionContext.Provider>;
}

/** Whether components should animate: the provider's override, else the inverse of the OS reduce-motion setting. */
export function useMotion(): boolean {
  const override = useContext(MotionContext);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (override !== undefined) return;
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [override]);

  return override ?? !reduceMotion;
}
