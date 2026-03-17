import { Redirect } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FieldInput } from '@/components/base/field-input';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { useFamilyQuery, useUpdateFamilyMutation } from '@/lib/api/react-query/hooks';
import { appRoutes } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function FamilyScreen() {
  const { theme } = useBookleafTheme();
  const connection = useSessionStore((state) => state.connection);
  const currentAccount = useSessionStore((state) => state.currentAccount);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const canManage = currentAccount?.system_role === 'admin';
  const familyQuery = useFamilyQuery();
  const updateFamilyMutation = useUpdateFamilyMutation();
  const family = familyQuery.data;
  const [familyName, setFamilyName] = React.useState('');
  const [ownerAccountId, setOwnerAccountId] = React.useState('');

  React.useEffect(() => {
    if (!family) {
      return;
    }

    setFamilyName(family.family_name);
    setOwnerAccountId(family.owner_account_id ? String(family.owner_account_id) : '');
  }, [family]);

  if (!connection) {
    return <Redirect href={appRoutes.connect} />;
  }

  if (!isAuthenticated) {
    return <Redirect href={appRoutes.authLogin} />;
  }

  return (
    <ScreenShell contentContainerStyle={{ gap: 20 }}>
      <Animated.View entering={createStaggeredFadeIn(0)}>
        <FlowScreenHeader
          description={`修改家庭名称，以及管理员账号的绑定关系。`}
          title="家庭设置"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          title="家庭资料">
          {isPreviewMode ? (
            <StateCard
              description="预览模式下不会保存任何修改。"
              title="预览模式"
              variant="warning"
            />
          ) : null}
          {!canManage ? (
            <StateCard
              description="只有管理员可以修改家庭资料。"
              title="当前为只读模式"
              variant="warning"
            />
          ) : null}
          {familyQuery.isLoading ? (
            <StateCard title="家庭资料加载中" description="正在同步当前家庭信息。" />
          ) : null}
          {familyQuery.error ? (
            <StateCard
              description={familyQuery.error.message}
              title="家庭资料不可用"
              variant="error"
            />
          ) : null}
          {family ? (
            <>
              <FieldInput
                label="家庭名称"
                onChangeText={setFamilyName}
                placeholder="例如：暮光阅读家"
                value={familyName}
              />
              <FieldInput
                hint="留空则不绑定管理员账号。"
                keyboardType="number-pad"
                label="管理员账号 ID"
                onChangeText={setOwnerAccountId}
                placeholder="例如：1"
                value={ownerAccountId}
              />
              <PrimaryActionButton
                disabled={!canManage || isPreviewMode || !familyName.trim()}
                label="保存家庭资料"
                loading={updateFamilyMutation.isPending}
                onPress={async () => {
                  if (!family?.id) {
                    return;
                  }

                  await updateFamilyMutation.mutateAsync({
                    familyId: family.id,
                    payload: {
                      family_name: familyName.trim(),
                      owner_account_id: ownerAccountId.trim()
                        ? Number(ownerAccountId.trim())
                        : null,
                    },
                  });
                }}
              />
              {updateFamilyMutation.error ? (
                <StateCard
                  description={updateFamilyMutation.error.message}
                  title="家庭资料还没有保存成功"
                  variant="error"
                />
              ) : null}
            </>
          ) : null}
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
        <SectionCard
          description="以下为当前家庭的成员，仅供查看。"
          title="当前成员">
          {!family?.members?.length ? (
            <StateCard title="暂时还没有成员" description="当前家庭还没有同步出成员信息。" />
          ) : null}
          {family?.members?.map((member, index) => (
            <Animated.View
              entering={createStaggeredFadeIn(index, 35)}
              key={member.id}
              layout={motionTransitions.gentle}
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderCurve: 'continuous',
                borderRadius: theme.radii.lg,
                gap: 4,
                padding: 14,
              }}>
              <Text
                selectable
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 15,
                }}>
                {member.name}
              </Text>
              <Text
                selectable
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 12,
                }}>
                {member.role ?? '家庭成员'}
              </Text>
            </Animated.View>
          ))}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
