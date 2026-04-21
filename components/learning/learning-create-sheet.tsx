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
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
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
        minHeight: dimensions.height * 0.6,
        width: '100%',
      }}>
      <View
        style={{
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.xxl,
          paddingBottom: theme.spacing.md, // changed from lg to md since subtitle is gone
        }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.bold,
            fontSize: 28,
            letterSpacing: -0.6,
          }}>
          创建学习导师
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          justifyContent: 'space-between',
        }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.md,
          }}>
          <View style={{ gap: theme.spacing.xxxl }}>
            <View style={{ gap: theme.spacing.lg }}>
              {!pickedDoc ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void handlePickDocument();
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                  <View
                    style={{
                      alignItems: 'center',
                      backgroundColor: theme.colors.surfaceKnowledge,
                      borderColor: theme.colors.knowledgeStrong,
                      borderRadius: theme.radii.xl,
                      borderStyle: 'dashed',
                      borderWidth: 1.5,
                      gap: theme.spacing.lg,
                      justifyContent: 'center',
                      paddingHorizontal: theme.spacing.lg,
                      paddingVertical: 56,
                    }}>
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: theme.colors.surface,
                        borderRadius: theme.radii.pill,
                        height: 64,
                        justifyContent: 'center',
                        shadowColor: theme.colors.text,
                        shadowOffset: { height: 4, width: 0 },
                        shadowOpacity: 0.05,
                        shadowRadius: 16,
                        width: 64,
                      }}>
                      <AppIcon
                        color={theme.colors.knowledgeStrong}
                        name="plus"
                        size={26}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          ...theme.typography.bold,
                          fontSize: 16,
                        }}>
                        选择文件
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textSoft,
                          ...theme.typography.medium,
                          fontSize: 13,
                        }}>
                        支持 PDF、Markdown、TXT
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ) : (
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderSoft,
                    borderRadius: theme.radii.xl,
                    borderWidth: 1,
                    flexDirection: 'row',
                    gap: theme.spacing.md,
                    padding: theme.spacing.lg,
                    shadowColor: theme.colors.text,
                    shadowOffset: { height: 2, width: 0 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                  }}>
                  <View
                    style={{
                      alignItems: 'center',
                      backgroundColor: theme.colors.knowledgeSoft,
                      borderRadius: theme.radii.md,
                      height: 48,
                      justifyContent: 'center',
                      width: 48,
                    }}>
                    <AppIcon
                      color={theme.colors.knowledgeStrong}
                      name="bookmark"
                      size={22}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.colors.text,
                        ...theme.typography.semiBold,
                        fontSize: 16,
                        letterSpacing: -0.2,
                      }}>
                      {pickedDoc.name}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        ...theme.typography.medium,
                        fontSize: 13,
                      }}>
                      {pickedDoc.mimeType?.replace('application/', '').replace('text/', '').toUpperCase() ??
                        '待识别文件类型'}
                      {pickedDoc.size ? ` • ${(pickedDoc.size / 1024 / 1024).toFixed(1)} MB` : ''}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="移除文件"
                    accessibilityRole="button"
                    onPress={() => setPickedDoc(null)}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor: theme.colors.surfaceMuted,
                      borderRadius: theme.radii.pill,
                      height: 36,
                      justifyContent: 'center',
                      opacity: pressed ? 0.7 : 1,
                      width: 36,
                    })}>
                    <AppIcon color={theme.colors.textMuted} name="x" size={18} strokeWidth={2} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        <View
          testID="learning-create-sheet-footer"
          style={{
            backgroundColor: theme.colors.surface,
            paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.md,
          }}>
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
      </View>
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
              presentationDetents(['medium']),
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
