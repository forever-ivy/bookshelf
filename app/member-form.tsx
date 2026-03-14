import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { FieldInput } from '@/components/base/field-input';
import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { useCreateUserMutation, useUpdateUserMutation, useUserQuery } from '@/lib/api/react-query/hooks';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

const memberRoles = [
  { label: '孩子', value: 'child' },
  { label: '家长', value: 'parent' },
  { label: '读者', value: 'reader' },
];

const memberColors = ['warm', 'cool', 'forest', 'sun'];

export default function MemberFormScreen() {
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const params = useLocalSearchParams<{ memberId?: string }>();
  const memberId = params.memberId ? Number(params.memberId) : null;
  const isEditing = Boolean(memberId);
  const userQuery = useUserQuery(memberId);
  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation(memberId);
  const [form, setForm] = React.useState({
    age: '',
    avatar: '',
    color: 'warm',
    grade_level: '',
    interests: '',
    name: '',
    pin: '',
    reading_level: '',
    role: 'child',
  });

  React.useEffect(() => {
    if (!userQuery.data) {
      return;
    }

    setForm({
      age: userQuery.data.age ? String(userQuery.data.age) : '',
      avatar: userQuery.data.avatar ?? '',
      color: userQuery.data.color ?? 'warm',
      grade_level: userQuery.data.grade_level ?? '',
      interests: userQuery.data.interests ?? '',
      name: userQuery.data.name,
      pin: userQuery.data.pin ?? '',
      reading_level: userQuery.data.reading_level ?? '',
      role: userQuery.data.role ?? 'child',
    });
  }, [userQuery.data]);

  if (!connection) {
    return <Redirect href="/connect" />;
  }

  const activeMutation = isEditing ? updateUserMutation : createUserMutation;

  return (
    <ScreenShell contentContainerStyle={{ gap: 20 }}>
      <Animated.View entering={createStaggeredFadeIn(0)}>
        <FlowScreenHeader
          description={isEditing ? '更新成员资料，让首页、档案页和报告里的展示更完整。' : '新建一个家庭成员，让 Bookleaf 可以开始围绕 TA 组织阅读节奏。'}
          title={isEditing ? '编辑成员' : '新增成员'}
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="保留最关键的家庭阅读信息，避免把前台应用做成后台管理系统。"
          title="基础资料">
          {isPreviewMode ? (
            <StateCard
              description="预览模式可以浏览表单布局，但不会真的保存成员。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          {isEditing && userQuery.isLoading ? (
            <StateCard
              description="正在把这个成员的旧资料带进表单。"
              title="成员资料加载中"
            />
          ) : null}
          {isEditing && userQuery.error ? (
            <StateCard
              description="成员资料暂时没有加载出来，不过你仍然可以返回成员列表重新进入。"
              title="这位成员暂时不可编辑"
              variant="error"
            />
          ) : null}
          <FieldInput
            label="姓名"
            onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="例如：米洛"
            value={form.name}
          />
          <FieldInput
            hint="可以是一个字、昵称或 emoji。"
            label="头像字符"
            onChangeText={(value) => setForm((current) => ({ ...current, avatar: value }))}
            placeholder="例如：米"
            value={form.avatar}
          />
          <FieldInput
            label="年龄"
            keyboardType="number-pad"
            onChangeText={(value) => setForm((current) => ({ ...current, age: value.replace(/[^0-9]/g, '') }))}
            placeholder="例如：8"
            value={form.age}
          />
          <FieldInput
            label="年级"
            onChangeText={(value) => setForm((current) => ({ ...current, grade_level: value }))}
            placeholder="例如：小学二年级"
            value={form.grade_level}
          />
          <FieldInput
            label="阅读阶段"
            onChangeText={(value) => setForm((current) => ({ ...current, reading_level: value }))}
            placeholder="例如：桥梁书"
            value={form.reading_level}
          />
          <FieldInput
            label="兴趣偏好"
            multiline
            onChangeText={(value) => setForm((current) => ({ ...current, interests: value }))}
            placeholder="例如：冒险故事、自然观察"
            value={form.interests}
          />
          <FieldInput
            hint="只有在你的后端有 PIN 流程时才会真正使用。"
            label="PIN"
            onChangeText={(value) => setForm((current) => ({ ...current, pin: value }))}
            placeholder="例如：1234"
            value={form.pin}
          />
          <View style={{ gap: 8 }}>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.text,
                fontFamily: bookleafTheme.fonts.semiBold,
                fontSize: 15,
              }}>
              成员角色
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {memberRoles.map((role) => (
                <ChoiceChip
                  isActive={form.role === role.value}
                  key={role.value}
                  label={role.label}
                  onPress={() => setForm((current) => ({ ...current, role: role.value }))}
                />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.text,
                fontFamily: bookleafTheme.fonts.semiBold,
                fontSize: 15,
              }}>
              主题色
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {memberColors.map((color) => (
                <ChoiceChip
                  isActive={form.color === color}
                  key={color}
                  label={color}
                  onPress={() => setForm((current) => ({ ...current, color }))}
                />
              ))}
            </View>
          </View>
          <PrimaryActionButton
            disabled={isPreviewMode || !form.name.trim()}
            label={isEditing ? '保存成员资料' : '创建成员'}
            loading={activeMutation.isPending}
            onPress={async () => {
              const payload = {
                age: form.age ? Number(form.age) : undefined,
                avatar: form.avatar || undefined,
                color: form.color,
                grade_level: form.grade_level || undefined,
                interests: form.interests || undefined,
                name: form.name.trim(),
                pin: form.pin || undefined,
                reading_level: form.reading_level || undefined,
                role: form.role,
              };

              if (isEditing) {
                await updateUserMutation.mutateAsync({ payload });
              } else {
                await createUserMutation.mutateAsync(payload);
              }

              router.back();
            }}
          />
          {activeMutation.error ? (
            <StateCard
              description={activeMutation.error.message}
              title={isEditing ? '成员资料还没保存成功' : '新成员还没创建成功'}
              variant="error"
            />
          ) : null}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}

function ChoiceChip({
  isActive,
  label,
  onPress,
}: {
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        backgroundColor: isActive ? bookleafTheme.colors.primary : bookleafTheme.colors.surfaceMuted,
        borderCurve: 'continuous',
        borderRadius: bookleafTheme.radii.pill,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}>
      <Text
        selectable
        style={{
          color: bookleafTheme.colors.text,
          fontFamily: bookleafTheme.fonts.semiBold,
          fontSize: 13,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}
