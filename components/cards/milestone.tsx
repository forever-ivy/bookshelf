import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import type { BadgeSummary } from '@/lib/api/contracts/types';

type MilestoneBadgeProps = {
  badgeKey: string;
  onPress?: () => void;
};

type MilestoneRailProps = {
  badges: BadgeSummary[];
};

type MilestoneDetailModalProps = {
  visible: boolean;
  onClose: () => void;
  badgeKey: string | null;
};

type MilestonePresentation = {
  label: string;
  source: number;
  details:string;
};

const milestoneByKey: Record<string, MilestonePresentation> = {
 book_10: {
  label: '借阅 10 本',
  source: require('@/assets/milestone/book_10.png'),
  details: '学而不辍，履践致远。愿你在书香中涵养志趣，积跬步以至千里。',
},
book_30: {
  label: '借阅 30 本',
  source: require('@/assets/milestone/book_30.png'),
  details: '读书渐丰，胸中有丘壑。正如“腹有诗书气自华”，愿你一路书香相伴。',
},
book_5: {
  label: '借阅 5 本',
  source: require('@/assets/milestone/book_5.png'),
  details: '开卷有益，初心得立。愿你以书为友，在点滴积累中收获成长。',
},
early_bird: {
  label: '晨光读者',
  source: require('@/assets/milestone/early_bird.png'),
  details: '晨诵晓读，正当其时。趁清风朝露，于晨光中开启崭新一天。',
},
first_book: {
  label: '首次借阅',
  source: require('@/assets/milestone/first_book.png'),
  details: '首启书卷，志在远方。愿你从今日出发，行而不辍，未来可期。',
},
night_owl: {
  label: '夜读小将',
  source: require('@/assets/milestone/night_owl.png'),
  details: '灯火可亲，夜读生辉。愿你在静夜书香里沉淀心志，厚积薄发。',
},
read_minutes_10: {
  label: '阅读 10 分钟',
  source: require('@/assets/milestone/read_minutes_10.png'),
  details: '积少成多，久久为功。每一次静心阅读，都是成长的悄然发生。',
},
read_minutes_30: {
  label: '阅读 30 分钟',
  source: require('@/assets/milestone/read_minutes_30.png'),
  details: '半时专注，渐入佳境。愿你在书页流转之间，见天地，见自我。',
},
read_minutes_5: {
  label: '阅读 5 分钟',
  source: require('@/assets/milestone/read_minutes_5.png'),
  details: '虽是片刻，亦见恒心。正所谓“不积小流，无以成江海”。',
},
read_minutes_50: {
  label: '阅读 50 分钟',
  source: require('@/assets/milestone/read_minutes_50.png'),
  details: '静心久读，意远情长。愿你以坚持涵养品格，于书海中汲取力量。',
},
variety_5: {
  label: '分类探索',
  source: require('@/assets/milestone/variety_5.png'),
  details: '博观约取，广学多识。愿你在多样阅读中开阔眼界，丰盈心灵。',
},
};

function MilestoneDetailModal({
  visible,
  onClose,
  badgeKey,
}: MilestoneDetailModalProps) {
  const { theme } = useBookleafTheme();
  const presentation = badgeKey ? milestoneByKey[badgeKey] : null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <Pressable
        onPress={onClose}
        style={{
          alignItems: 'center',
          backgroundColor: theme.milestone.modalScrim,
          flex: 1,
          justifyContent: 'center',
          padding: 24,
        }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            alignItems: 'center',
            backgroundColor: theme.milestone.modalBackground,
            borderColor: theme.milestone.modalBorder,
            borderCurve: 'continuous',
            borderRadius: 32,
            borderWidth: 1,
            gap: 24,
            padding: 40,
            width: 280,
          }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.milestone.haloOuter,
              borderColor: theme.milestone.haloOuterBorder,
              borderCurve: 'continuous',
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              boxShadow: theme.milestone.haloOuterShadow,
              height: 140,
              justifyContent: 'center',
              width: 140,
            }}>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: theme.milestone.haloInner,
                borderCurve: 'continuous',
                borderRadius: theme.radii.pill,
                height: 110,
                justifyContent: 'center',
                width: 110,
              }}>
              {presentation ? (
                <Image
                  contentFit="contain"
                  source={presentation.source}
                  style={{ height: 220, width: 220 }}
                  transition={0}
                />
              ) : (
                <AppIcon
                  color={theme.colors.primaryStrong}
                  name="spark"
                  size={48}
                />
              )}
            </View>
          </View>
          <Text
          style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 20,
              textAlign: 'center',
            }}>
            {presentation?.label ?? badgeKey}
          </Text>
          <Text
          style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              textAlign: 'center',
            }}>
            {presentation?.details ?? ''}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: theme.milestone.buttonBackground,
              borderCurve: 'continuous',
              borderRadius: 12,
              marginTop: 8,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}>
            <Text
              style={{
                color: theme.milestone.buttonText,
                ...theme.typography.semiBold,
                fontSize: 15,
              }}>
              关闭
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );
}

export function MilestoneBadge({ badgeKey, onPress }: MilestoneBadgeProps) {
  const { theme } = useBookleafTheme();
  const presentation = milestoneByKey[badgeKey];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        alignItems: 'center',
        justifyContent:"center",
        backgroundColor: theme.milestone.cardBackground,
        borderColor: theme.milestone.cardBorder,
        borderCurve: 'continuous',
        borderRadius: 28,
        borderWidth: 1,
        gap: 12,
        minHeight: 184,
        paddingHorizontal: 14,
        paddingVertical: 16,
        width: 152,
      }}
      testID="milestone-badge">
      <View style={{ alignItems: 'center', gap: 12 }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.milestone.haloOuter,
            borderColor: theme.milestone.haloOuterBorder,
            borderCurve: 'continuous',
            borderRadius: theme.radii.pill,
            borderWidth: 1,
            boxShadow: theme.milestone.haloOuterShadow,
            height: 78,
            justifyContent: 'center',
            width: 78,
          }}
          testID="milestone-badge-halo">
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.milestone.haloInner,
              borderCurve: 'continuous',
              borderRadius: theme.radii.pill,
              height: 60,
              justifyContent: 'center',
              width: 60,
            }}>
            {presentation ? (
              <Image
                contentFit="contain"
                source={presentation.source}
                style={{ height: 120, width: 120 }}
                testID="milestone-badge-image"
                transition={0}
              />
            ) : (
              <AppIcon
                color={theme.colors.primaryStrong}
                name="spark"
                size={24}
              />
            )}
          </View>
        </View>
        <Text
          numberOfLines={2}
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 13,
            lineHeight: 18,
            minHeight: 36,
            textAlign: 'center',
          }}>
          {presentation?.label ?? badgeKey}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function MilestoneRail({ badges }: MilestoneRailProps) {
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleBadgePress = (badgeKey: string) => {
    setSelectedBadge(badgeKey);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedBadge(null);
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={{ gap: 14, paddingHorizontal: 4, paddingRight: 20 }}
        horizontal
        showsHorizontalScrollIndicator={false}
        testID="milestone-rail">
        {badges.map((badge) => (
          <MilestoneBadge
            badgeKey={badge.badge_key}
            key={`${badge.badge_key}-${badge.unlocked_at}`}
            onPress={() => handleBadgePress(badge.badge_key)}
          />
        ))}
      </ScrollView>
      <MilestoneDetailModal
        badgeKey={selectedBadge}
        onClose={handleCloseModal}
        visible={modalVisible}
      />
    </>
  );
}
