import {
  BottomSheet,
  Group,
  Host as SwiftHost,
  RNHostView as SwiftRNHostView,
} from '@expo/ui/swift-ui';
import {
  interactiveDismissDisabled,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import {
  Host as ComposeHost,
  ModalBottomSheet,
  RNHostView as ComposeRNHostView,
} from '@expo/ui/jetpack-compose';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { toast } from 'sonner-native';

import { AppIcon } from '@/components/base/app-icon';
import { PillButton } from '@/components/base/pill-button';
import { useAppTheme } from '@/hooks/use-app-theme';

export type PickedDocument = {
  mimeType?: string | null;
  name: string;
  size?: number;
  uri: string;
};

type DocumentPickerModule = {
  getDocumentAsync: (options: {
    type: string[];
  }) => Promise<{
    assets?: { mimeType?: string | null; name: string; size?: number; uri: string }[];
    canceled: boolean;
  }>;
};

function LearningCreateSheetContent({
  creating,
  onClose,
  onDocumentPicked,
}: {
  creating: boolean;
  onClose: () => void;
  onDocumentPicked: (doc: PickedDocument) => void | Promise<void>;
}) {
  const { theme } = useAppTheme();
  const [pickedDoc, setPickedDoc] = React.useState<PickedDocument | null>(null);

  const handlePickDocument = async () => {
    try {
      const DocumentPicker = (await import('expo-document-picker')) as DocumentPickerModule;
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/markdown', 'text/plain'],
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setPickedDoc({
          mimeType: asset.mimeType ?? null,
          name: asset.name,
          size: asset.size,
          uri: asset.uri,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes('ExpoDocumentPicker')
          ? '当前构建还没有文件选择器模块，重新安装开发包后即可使用。'
          : '暂时无法打开文件选择器，请稍后再试。';

      toast.error(message);
    }
  };

  const handleCreate = async () => {
    if (!pickedDoc) {
      toast.error('请先选择一份学习资料。');
      return;
    }

    await onDocumentPicked(pickedDoc);
  };

  return (
    <View
      testID="learning-create-sheet-content"
      style={{
        alignSelf: 'stretch',
        backgroundColor: theme.colors.surface,
        flex: 1,
        gap: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.xl,
      }}>
      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 24,
          }}>
          创建学习导师
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 21,
          }}>
          上传一份学习资料，我们会在后台完成解析、建立导学路径，并为你准备好工作区。
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: theme.spacing.xl }}>
          <View style={{ gap: theme.spacing.md }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 15,
              }}>
              上传资料
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void handlePickDocument();
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}>
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.colors.surfaceKnowledge,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radii.lg,
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  gap: theme.spacing.sm,
                  justifyContent: 'center',
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.xl,
                }}>
                <AppIcon color={theme.colors.primaryStrong} name="plus" size={24} />
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 14,
                  }}>
                  选择文件
                </Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 12,
                  }}>
                  支持 PDF、Markdown、TXT
                </Text>
              </View>
            </Pressable>
            {pickedDoc ? (
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.colors.primarySoft,
                  borderColor: theme.colors.primaryStrong,
                  borderRadius: theme.radii.lg,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                }}>
                <AppIcon color={theme.colors.primaryStrong} name="bookmark" size={16} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.medium,
                      fontSize: 13,
                    }}>
                    {pickedDoc.name}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSoft,
                      ...theme.typography.medium,
                      fontSize: 11,
                    }}>
                    {pickedDoc.mimeType ?? '待识别文件类型'}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="移除文件"
                  accessibilityRole="button"
                  onPress={() => setPickedDoc(null)}>
                  <AppIcon color={theme.colors.textMuted} name="x" size={16} />
                </Pressable>
              </View>
            ) : null}
          </View>

          <PillButton
            fullWidth
            href={undefined}
            icon="spark"
            label={creating ? '创建中…' : '创建导师'}
            onPress={() => {
              void handleCreate();
            }}
            size="hero"
            variant="accent"
          />
        </View>
      </ScrollView>
    </View>
  );
}

export function LearningCreateSheet({
  creating = false,
  onClose,
  onDocumentPicked,
  visible,
}: {
  creating?: boolean;
  onClose: () => void;
  onDocumentPicked: (doc: PickedDocument) => void | Promise<void>;
  visible: boolean;
}) {
  const contentProps = {
    creating,
    onClose,
    onDocumentPicked,
  };

  if (Platform.OS === 'ios') {
    return (
      <SwiftHost style={{ position: 'absolute' }} testID="learning-create-sheet-swift-host">
        <BottomSheet
          isPresented={visible}
          onIsPresentedChange={(nextValue) => {
            if (!nextValue) onClose();
          }}
          testID="learning-create-sheet">
          <Group
            modifiers={[
              presentationDetents(['large']),
              presentationDragIndicator('visible'),
              interactiveDismissDisabled(false),
            ]}>
            {visible ? (
              <SwiftRNHostView>
                <LearningCreateSheetContent {...contentProps} />
              </SwiftRNHostView>
            ) : (
              <View />
            )}
          </Group>
        </BottomSheet>
      </SwiftHost>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View testID="learning-create-sheet-compose-host">
        <ComposeHost matchContents={{ vertical: true, horizontal: false }} style={{ position: 'absolute' }}>
          {visible ? (
            <ModalBottomSheet onDismissRequest={onClose} skipPartiallyExpanded>
              <ComposeRNHostView>
                <LearningCreateSheetContent {...contentProps} />
              </ComposeRNHostView>
            </ModalBottomSheet>
          ) : null}
        </ComposeHost>
      </View>
    );
  }

  return null;
}
