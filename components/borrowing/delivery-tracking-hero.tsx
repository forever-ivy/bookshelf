import React from 'react';
import { Text, View } from 'react-native';

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

export function DeliveryTrackingHero({ tracking }: DeliveryTrackingHeroProps) {
  const { theme } = useAppTheme();
  const center = circleSize / 2;
  const visualProgress = tracking.state === 'delivered' ? 0.94 : tracking.progress;
  const distanceFromCenter = (1 - visualProgress) * trackingRadius;
  const angleInRadians = (approachAngleDegrees * Math.PI) / 180;
  const truckCenterX = center + Math.cos(angleInRadians) * distanceFromCenter;
  const truckCenterY = center + Math.sin(angleInRadians) * distanceFromCenter;
  const markerColor =
    tracking.state === 'delivered'
      ? theme.colors.success
      : tracking.state === 'arriving'
        ? theme.colors.warning
        : theme.colors.primaryStrong;

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
      <View style={{ gap: theme.spacing.xs }}>
        <Text
          style={{
            color: theme.colors.textSoft,
            ...theme.typography.semiBold,
            fontSize: 11,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}>
          配送追踪 Mock
        </Text>
        <Text style={{ color: theme.colors.text, ...theme.typography.heading, fontSize: 28 }}>
          {tracking.title}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 21,
          }}>
          {tracking.description}
        </Text>
      </View>

      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.primarySoft,
          borderRadius: theme.radii.xl,
          paddingVertical: theme.spacing.xl,
        }}>
        <View
          style={{
            alignItems: 'center',
            height: circleSize,
            justifyContent: 'center',
            position: 'relative',
            width: circleSize,
          }}>
          {[0, 1, 2].map((index) => {
            const ringInset = index * 26;

            return (
              <View
                key={index}
                style={{
                  borderColor: index === 0 ? theme.colors.borderStrong : theme.colors.borderSoft,
                  borderRadius: 999,
                  borderWidth: 1,
                  height: circleSize - ringInset * 2,
                  opacity: index === 0 ? 1 : 0.7 - index * 0.15,
                  position: 'absolute',
                  width: circleSize - ringInset * 2,
                }}
              />
            );
          })}

          <View
            style={{
              backgroundColor: markerColor,
              borderRadius: 999,
              height: markerSize,
              left: truckCenterX - markerSize / 2,
              position: 'absolute',
              top: truckCenterY - markerSize / 2,
              width: markerSize,
            }}
          />
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.surfaceTint,
              borderColor: theme.colors.borderSoft,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 6,
              left: truckCenterX - 34,
              paddingHorizontal: 10,
              paddingVertical: 5,
              position: 'absolute',
              top: truckCenterY - 38,
            }}>
            <AppIcon color={markerColor} name="truck" size={14} strokeWidth={1.9} />
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 12,
              }}>
              {tracking.vehicleLabel}
            </Text>
          </View>

          <View
            style={{
              alignItems: 'center',
              position: 'absolute',
            }}>
            <View
              style={{
                backgroundColor: theme.colors.markerHighlightRed,
                borderColor: theme.colors.surface,
                borderRadius: 999,
                borderWidth: 4,
                height: centerDotSize,
                width: centerDotSize,
              }}
            />
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 12,
                marginTop: 8,
              }}>
              我
            </Text>
            <Text
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.body,
                fontSize: 11,
              }}>
              {tracking.destinationLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <MetricCard label="剩余距离" value={tracking.distanceLabel} />
        <MetricCard label="预计送达" value={tracking.etaLabel} />
      </View>

      <View
        style={{
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          gap: theme.spacing.xs,
          padding: theme.spacing.lg,
        }}>
        <Text style={{ color: theme.colors.textSoft, ...theme.typography.semiBold, fontSize: 12 }}>
          配送说明
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 13,
            lineHeight: 19,
          }}>
          {tracking.routeLabel}
        </Text>
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
