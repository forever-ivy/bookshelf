import Pdf from 'react-native-pdf';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LearningWorkspaceLoadingState } from '@/components/learning/learning-workspace-loading-state';
import { LEARNING_WORKSPACE_TOP_CHROME_OFFSET } from '@/components/learning/learning-workspace-scaffold';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryServiceBaseUrl } from '@/lib/api/client';
import { resolveLearningWorkspaceHasViewableDocument } from '@/lib/learning/workspace';

function UnsupportedDocumentState() {
  const { theme } = useAppTheme();

  return (
    <View style={styles.emptyState}>
      <Text
        style={[
          styles.emptyTitle,
          {
            color: theme.colors.text,
            fontFamily: theme.typography.bold.fontFamily,
          },
        ]}>
        暂不支持查看资料
      </Text>
      <Text
        style={[
          styles.emptyBody,
          {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.body.fontFamily,
          },
        ]}>
        当前导学本还没有可直接打开的 PDF 原件，后续补齐后会在这里展示。
      </Text>
    </View>
  );
}

export default function LearningWorkspaceDocumentRoute() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAppSession();
  const { closeWorkspace, profile, workspaceGate } = useLearningWorkspaceScreen();
  const [loadFailed, setLoadFailed] = React.useState(false);

  React.useEffect(() => {
    setLoadFailed(false);
  }, [profile?.id]);

  if (workspaceGate.kind !== 'ready' || !profile) {
    return (
      <LearningWorkspaceLoadingState
        description={workspaceGate.description}
        secondaryAction={{
          label: '返回导学本库',
          onPress: closeWorkspace,
        }}
        title={workspaceGate.title}
        visualState={workspaceGate.kind === 'loading' ? 'skeleton' : 'copy'}
      />
    );
  }

  const baseUrl = getLibraryServiceBaseUrl();
  const hasViewableDocument = resolveLearningWorkspaceHasViewableDocument(profile);
  const documentSource =
    baseUrl && hasViewableDocument
      ? {
          cache: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          uri: `${baseUrl}/api/v2/learning/profiles/${profile.id}/document`,
        }
      : null;
  const floatingChromeTop = insets.top + LEARNING_WORKSPACE_TOP_CHROME_OFFSET;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.backgroundWorkspace,
        },
      ]}>
      {documentSource && !loadFailed ? (
        <Pdf
          enableDoubleTapZoom
          fitPolicy={2}
          onError={() => setLoadFailed(true)}
          source={documentSource}
          style={styles.viewer}
          trustAllCerts={false}
        />
      ) : (
        <UnsupportedDocumentState />
      )}

      <View
        pointerEvents="box-none"
        style={[styles.floatingChrome, { top: floatingChromeTop }]}
        testID="learning-workspace-document-floating-chrome">
        <SecondaryBackButton
          label="返回学习区"
          onPress={closeWorkspace}
          testID="learning-workspace-document-back-glass"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    letterSpacing: -0.4,
    lineHeight: 28,
    textAlign: 'center',
  },
  floatingChrome: {
    left: 16,
    position: 'absolute',
    zIndex: 120,
  },
  viewer: {
    flex: 1,
  },
});
