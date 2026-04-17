import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppIcon } from '@/components/base/app-icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { MockDeliveryTracking } from '@/lib/borrowing/order-delivery-tracking';

type DeliveryTrackingHeroProps = {
  tracking: MockDeliveryTracking;
};

const circleSize = 220;
const trackingRadius = 72;
const markerSize = 18;
const centerDotSize = 16;
const approachAngleDegrees = -135;

function PulsingRing({
  circleSize,
  delay,
  markerColor,
}: {
  circleSize: number;
  delay: number;
  markerColor: string;
}) {
  const ringProgress = useSharedValue(0);

  useEffect(() => {
    ringProgress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, [delay, ringProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      borderColor: markerColor,
      opacity: interpolate(
        ringProgress.value,
        [0, 0.2, 0.8, 1],
        [0, 0.6, 0.1, 0],
        Extrapolation.CLAMP
      ),
      transform: [
        { scale: interpolate(ringProgress.value, [0, 1], [0.1, 1.3], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          borderRadius: circleSize / 2,
          borderWidth: 2,
          height: circleSize,
          position: 'absolute',
          width: circleSize,
          zIndex: 1,
        },
        animatedStyle,
      ]}
    />
  );
}

export function DeliveryTrackingHero({ tracking }: DeliveryTrackingHeroProps) {
  const { theme } = useAppTheme();
  
  // 强制伪造一个起点，确保每次展示界面都播一段“假动画”
  // 如果原本的数据是 0m（已送达），则重置为一个演示距离（如 80m 开外），否则使用真实传入的最开始距离
  const demoStartDistance = tracking.distanceMeters > 0 ? tracking.distanceMeters : 80;
  const demoStartProgress = tracking.progress < 1 ? tracking.progress : 0.1;
  const totalSimDistance = demoStartDistance / (1 - demoStartProgress); // 反推总距离以维持动画连贯性

  const [simulatedDistance, setSimulatedDistance] = useState(demoStartDistance);
  const [simulatedState, setSimulatedState] = useState<'inTransit' | 'arriving' | 'delivered'>('inTransit');
  const animatedProgress = useSharedValue(demoStartProgress);
  const previousState = useRef(simulatedState);

  useEffect(() => {
    // 强制触发从远到近的 1m/s 物理模拟过渡，不管 tracking 原本是什么状态
    animatedProgress.value = demoStartProgress;
    
    // 起步动画缓冲
    animatedProgress.value = withTiming(0.94, {
      duration: demoStartDistance * 1000,
      easing: Easing.linear,
    });

    const interval = setInterval(() => {
      setSimulatedDistance((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          setSimulatedState('delivered');
          return 0;
        }
        if (next <= 20 && next > 0) {
          setSimulatedState('arriving');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle Haptic transitions based on internal simulation clock
  useEffect(() => {
    if (
      simulatedState !== previousState.current &&
      (simulatedState === 'arriving' || simulatedState === 'delivered')
    ) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    previousState.current = simulatedState;
  }, [simulatedState]);

  const markerColor =
    simulatedState === 'delivered'
      ? theme.colors.availabilityReady
      : simulatedState === 'arriving'
        ? theme.colors.availabilityReady
        : theme.colors.availabilityPickup;

  // Use Reanimated for smooth 60fps tracking avoiding full component React render block every frame
  const center = circleSize / 2;
  const animatedAngle = (approachAngleDegrees * Math.PI) / 180;
  
  const animatedTruckDotStyle = useAnimatedStyle(() => {
    const visualProgress = simulatedState === 'delivered' ? 0.94 : animatedProgress.value;
    const distanceFromCenter = (1 - visualProgress) * trackingRadius;
    const truckCenterX = center + Math.cos(animatedAngle) * distanceFromCenter;
    const truckCenterY = center + Math.sin(animatedAngle) * distanceFromCenter;

    return {
      left: truckCenterX - markerSize / 2,
      top: truckCenterY - markerSize / 2,
    };
  });

  const animatedTruckLabelStyle = useAnimatedStyle(() => {
    const visualProgress = simulatedState === 'delivered' ? 0.94 : animatedProgress.value;
    const distanceFromCenter = (1 - visualProgress) * trackingRadius;
    const truckCenterX = center + Math.cos(animatedAngle) * distanceFromCenter;
    const truckCenterY = center + Math.sin(animatedAngle) * distanceFromCenter;

    return {
      left: truckCenterX - 34,
      top: truckCenterY - 40,
    };
  });

  const displayedDistanceLabel = simulatedState === 'delivered' ? '0 m' : `${simulatedDistance} m`;
  const displayedEtaLabel = simulatedState === 'delivered' ? '刚刚送达' : `约 ${Math.ceil(simulatedDistance / 60)} 分钟`;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.xl,
        borderWidth: 1,
        gap: theme.spacing.lg,
        overflow: 'hidden',
        padding: theme.spacing.xl,
      }}
      testID="delivery-tracking-hero">
      
      <View style={{ marginBottom: theme.spacing.md, marginTop: theme.spacing.xs }}>
        <Text 
          style={{ 
            color: theme.colors.text, 
            ...theme.typography.heading, 
            fontSize: 32, 
            letterSpacing: -0.5 
          }}>
          {simulatedState === 'delivered' 
            ? '图书已送达' 
            : simulatedState === 'arriving' 
              ? '机器人即将送达' 
              : '机器人正在送书中'}
        </Text>
      </View>

      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.primarySoft,
          borderRadius: theme.radii.xl,
          paddingVertical: theme.spacing.xl,
          overflow: 'hidden'
        }}>
        <View
          style={{
            alignItems: 'center',
            height: circleSize,
            justifyContent: 'center',
            position: 'relative',
            width: circleSize,
          }}>
          
          <PulsingRing circleSize={circleSize} delay={0} markerColor={markerColor} />
          <PulsingRing circleSize={circleSize} delay={1000} markerColor={markerColor} />
          <PulsingRing circleSize={circleSize} delay={2000} markerColor={markerColor} />

          <View
            style={{
              alignItems: 'center',
              position: 'absolute',
              zIndex: 10,
            }}>
            <View
              style={{
                backgroundColor: theme.colors.systemBlue,
                borderColor: theme.colors.surfaceTint,
                borderRadius: 999,
                borderWidth: 3,
                height: centerDotSize + 8,
                shadowColor: theme.colors.systemBlue,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                width: centerDotSize + 8,
              }}
            />
          </View>
          
          <View style={{ alignItems: 'center', position: 'absolute', top: circleSize / 2 + 16, zIndex: 10 }}>
             <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.bold,
                  fontSize: 13,
                  textShadowColor: theme.colors.surface,
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}>
                我
              </Text>
          </View>

          <Animated.View
            style={[
              {
                backgroundColor: markerColor,
                borderRadius: 999,
                height: markerSize,
                position: 'absolute',
                width: markerSize,
                shadowColor: markerColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
                zIndex: 20
              },
              animatedTruckDotStyle
            ]}
          />
          <Animated.View
            style={[
              {
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
                borderColor: markerColor,
                borderRadius: theme.radii.pill,
                borderWidth: 1.5,
                flexDirection: 'row',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                position: 'absolute',
                shadowColor: markerColor,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
                zIndex: 30
              },
              animatedTruckLabelStyle
            ]}>
            <AppIcon color={markerColor} name="truck" size={14} strokeWidth={2.5} />
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.bold,
                fontSize: 12,
              }}>
              {tracking.vehicleLabel}
            </Text>
          </Animated.View>

        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <MetricCard label="剩余距离" value={displayedDistanceLabel} />
        <MetricCard label="预计送达" value={displayedEtaLabel} />
      </View>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceStrong,
        borderColor: theme.colors.borderSoft,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        flex: 1,
        gap: theme.spacing.xs,
        padding: theme.spacing.lg,
      }}>
      <Text style={{ color: theme.colors.textSoft, ...theme.typography.semiBold, fontSize: 12 }}>
        {label}
      </Text>
      <Text style={{ color: theme.colors.text, ...theme.typography.heading, fontSize: 24 }}>{value}</Text>
    </View>
  );
}
