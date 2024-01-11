import { View } from 'react-native';

import { styles } from './styles';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

interface Props {
  total: number;
  current: number;
}

export function ProgressBar({ total, current }: Props) {
  const percentage = Math.round((current / total) * 100);

  const size = useSharedValue(0)

  const styleAnimated = useAnimatedStyle(() => ({
    width: `${size.value}%`
  }))

  useEffect(() => {
    size.value = withTiming(percentage)
  }, [current])

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.progress, styleAnimated]} />
    </View>
  );
}