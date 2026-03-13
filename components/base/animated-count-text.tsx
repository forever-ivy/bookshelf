import React from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motionTokens } from '@/lib/presentation/motion';

type AnimatedCountTextProps = {
  style?: StyleProp<TextStyle>;
  value: number;
};

export function AnimatedCountText({
  style,
  value,
}: AnimatedCountTextProps) {
  const [displayValue, setDisplayValue] = React.useState(Math.round(value));
  const animatedValue = useSharedValue(Math.round(value));

  React.useEffect(() => {
    animatedValue.value = withTiming(Math.round(value), {
      duration: motionTokens.duration.slow,
    });
  }, [animatedValue, value]);

  useAnimatedReaction(
    () => Math.round(animatedValue.value),
    (nextValue, previousValue) => {
      if (nextValue !== previousValue) {
        runOnJS(setDisplayValue)(nextValue);
      }
    }
  );

  return (
    <Animated.Text selectable style={style}>
      {displayValue}
    </Animated.Text>
  );
}
