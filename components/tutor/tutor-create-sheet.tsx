import {
  BottomSheet,
  Group,
  Host as SwiftHost,
  RNHostView as SwiftRNHostView,
  ScrollView as SwiftScrollView,
} from '@expo/ui/swift-ui';
import {
  background,
  interactiveDismissDisabled,
  presentationDetents,
  presentationDragIndicator,
  scrollContentBackground,
} from '@expo/ui/swift-ui/modifiers';
import {
  Host as ComposeHost,
  ModalBottomSheet,
  RNHostView as ComposeRNHostView,
} from '@expo/ui/jetpack-compose';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { toast } from 'sonner-native';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { PillButton } from '@/components/base/pill-button';
import { useAppTheme } from '@/hooks/use-app-theme';

type TutorStylePreset = {
  description: string;
  icon: AppIconName;
  key: string;
  style: string;
  title: string;
};

const tutorStylePresets: TutorStylePreset[] = [
  {
    description: '通过反问引导你自己找到答案，不直接给结论。',
    icon: 'tutor',
    key: 'socratic',
    style: '苏格拉底式提问，循序渐进，鼓励独立思考。',
    title: '苏格拉底式导师',
  },
  {
    description: '先给框架再填细节，适合备考和系统复习。',
    icon: 'package',
    key: 'structured',
    style: '结构化教学，先总后分，重点突出，配合练习巩固。',
    title: '结构化讲师',
  },
  {
    description: '用生活类比解释抽象概念，轻松易懂。',
    icon: 'spark',
    key: 'storyteller',
    style: '善用比喻和故事，将复杂概念转化为直觉理解。',
    title: '故事型讲解',
  },
];

export type PickedDocument = {
  name: string;
  size?: number;
  uri: string;
};

type DocumentPickerModule = {
  getDocumentAsync: (options: {
    type: string[];
  }) => Promise<{
    assets?: { name: string; size?: number; uri: string }[];
    canceled: boolean;
  }>;
};

function TutorCreateSheetContent({
  creating,
  onClose,
  onCreateWithStyle,
  onDocumentPicked,
}: {
  creating: boolean;
  onClose: () => void;
  onCreateWithStyle: (input: { customPrompt?: string; styleKey: string }) => void | Promise<void>;
  onDocumentPicked: (doc: PickedDocument) => void | Promise<void>;
}) {
  const { theme } = useAppTheme();
  const [selectedStyle, setSelectedStyle] = React.useState<string>('socratic');
  const [customPrompt, setCustomPrompt] = React.useState('');
  const [pickedDoc, setPickedDoc] = React.useState<PickedDocument | null>(null);
  const selectedPreset = tutorStylePresets.find((preset) => preset.key === selectedStyle) ?? null;

  const handlePickDocument = async () => {
    try {
      const DocumentPicker = (await import('expo-document-picker')) as DocumentPickerModule;
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/markdown', 'text/plain', 'application/epub+zip'],
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const doc: PickedDocument = { name: asset.name, size: asset.size, uri: asset.uri };
        setPickedDoc(doc);
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
    if (pickedDoc) {
      await onDocumentPicked(pickedDoc);
    }
    await onCreateWithStyle({
      customPrompt: selectedStyle === 'custom' ? customPrompt.trim() || undefined : undefined,
      styleKey: selectedStyle,
    });
  };

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
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
          选择导师风格，再上传学习资料。
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: theme.spacing.xl }}>
          {/* ── 导师风格 ── */}
          <View style={{ gap: theme.spacing.md }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 15,
              }}>
              导师风格
            </Text>
            <View style={{ gap: theme.spacing.sm }}>
              {tutorStylePresets.map((preset) => {
                const isSelected = selectedStyle === preset.key;
                return (
                  <Pressable
                    key={preset.key}
                    accessibilityRole="button"
                    onPress={() => setSelectedStyle(preset.key)}
                    testID={`tutor-style-card-${preset.key}`}
                    style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}>
                    <View
                      style={{
                        backgroundColor: isSelected
                          ? theme.colors.primarySoft
                          : theme.colors.surface,
                        borderColor: isSelected
                          ? theme.colors.primaryStrong
                          : theme.colors.borderStrong,
                        borderRadius: theme.radii.lg,
                        borderWidth: isSelected ? 1.5 : 1,
                        flexDirection: 'row',
                        gap: theme.spacing.md,
                        minHeight: 80,
                        padding: theme.spacing.lg,
                      }}>
                      <View
                        style={{
                          alignItems: 'center',
                          backgroundColor: isSelected
                            ? theme.colors.primaryStrong
                            : theme.colors.primarySoft,
                          borderRadius: theme.radii.md,
                          height: 40,
                          justifyContent: 'center',
                          width: 40,
                        }}>
                        <AppIcon
                          color={isSelected ? '#fff' : theme.colors.primaryStrong}
                          name={preset.icon}
                          size={18}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text
                          style={{
                            color: theme.colors.text,
                            ...theme.typography.semiBold,
                            fontSize: 15,
                          }}>
                          {preset.title}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.textMuted,
                            ...theme.typography.body,
                            fontSize: 13,
                            lineHeight: 19,
                          }}>
                          {preset.description}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}

              {/* 自定义选项 */}
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedStyle('custom')}
                testID="tutor-style-card-custom"
                style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}>
                <View
                  style={{
                    backgroundColor:
                      selectedStyle === 'custom'
                        ? theme.colors.primarySoft
                        : theme.colors.surface,
                    borderColor:
                      selectedStyle === 'custom'
                        ? theme.colors.primaryStrong
                        : theme.colors.borderStrong,
                    borderRadius: theme.radii.lg,
                    borderWidth: selectedStyle === 'custom' ? 1.5 : 1,
                    gap: theme.spacing.md,
                    padding: theme.spacing.lg,
                  }}>
                  <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor:
                          selectedStyle === 'custom'
                            ? theme.colors.primaryStrong
                            : theme.colors.primarySoft,
                        borderRadius: theme.radii.md,
                        height: 40,
                        justifyContent: 'center',
                        width: 40,
                      }}>
                      <AppIcon
                        color={selectedStyle === 'custom' ? '#fff' : theme.colors.primaryStrong}
                        name="plus"
                        size={18}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          ...theme.typography.semiBold,
                          fontSize: 15,
                        }}>
                        自定义风格
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          ...theme.typography.body,
                          fontSize: 13,
                          lineHeight: 19,
                        }}>
                        用你自己的话描述理想的导师风格。
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* 风格说明 */}
            {selectedStyle === 'custom' ? (
              <View
                style={{
                  backgroundColor: theme.colors.surfaceKnowledge,
                  borderRadius: theme.radii.md,
                  gap: theme.spacing.sm,
                  padding: theme.spacing.md,
                }}
                testID="tutor-style-custom-prompt-panel">
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 13,
                    lineHeight: 20,
                  }}>
                  用一句话定一下你想要的讲解方式，我们会按这个人格去带你学。
                </Text>
                <TextInput
                  multiline
                  onChangeText={setCustomPrompt}
                  placeholder="例如：用轻松幽默的方式讲解，多举生活中的例子…"
                  placeholderTextColor={theme.colors.textSoft}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderSoft,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    color: theme.colors.text,
                    minHeight: 88,
                    paddingHorizontal: theme.spacing.md,
                    paddingTop: 12,
                    textAlignVertical: 'top',
                  }}
                  value={customPrompt}
                />
              </View>
            ) : selectedPreset ? (
              <View
                style={{
                  backgroundColor: theme.colors.surfaceKnowledge,
                  borderRadius: theme.radii.md,
                  padding: theme.spacing.md,
                }}>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                  fontSize: 13,
                  lineHeight: 20,
                }}>
                  {selectedPreset.style}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── 上传资料 ── */}
          <View style={{ gap: theme.spacing.md }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 15,
              }}>
              上传学习资料
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => { void handlePickDocument(); }}
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
                  支持 PDF、Markdown、TXT、EPUB
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
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.text,
                    flex: 1,
                    ...theme.typography.medium,
                    fontSize: 13,
                  }}>
                  {pickedDoc.name}
                </Text>
                <Pressable
                  accessibilityLabel="移除文件"
                  accessibilityRole="button"
                  onPress={() => setPickedDoc(null)}>
                  <AppIcon color={theme.colors.textMuted} name="x" size={16} />
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* ── 创建按钮 ── */}
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

export function TutorCreateSheet({
  creating = false,
  onClose,
  onDocumentPicked,
  onCreateWithStyle,
  visible,
}: {
  creating?: boolean;
  onClose: () => void;
  onDocumentPicked: (doc: PickedDocument) => void | Promise<void>;
  onCreateWithStyle: (input: { customPrompt?: string; styleKey: string }) => void | Promise<void>;
  visible: boolean;
}) {
  const { theme } = useAppTheme();
  const contentProps = {
    creating,
    onClose,
    onDocumentPicked,
    onCreateWithStyle,
  };

  if (Platform.OS === 'ios') {
    return (
      <SwiftHost style={{ position: 'absolute' }} testID="tutor-create-sheet-swift-host">
        <BottomSheet
          isPresented={visible}
          onIsPresentedChange={(nextValue) => {
            if (!nextValue) onClose();
          }}
          testID="tutor-create-sheet">
          <Group
            modifiers={[
              presentationDetents(['large']),
              presentationDragIndicator('visible'),
              interactiveDismissDisabled(false),
            ]}>
            {visible ? (
              <SwiftScrollView
                modifiers={[
                  scrollContentBackground('hidden'),
                  background(theme.colors.surface),
                ]}
                showsIndicators={false}>
                <SwiftRNHostView matchContents>
                  <TutorCreateSheetContent {...contentProps} />
                </SwiftRNHostView>
              </SwiftScrollView>
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
      <View testID="tutor-create-sheet-compose-host">
        <ComposeHost matchContents style={{ position: 'absolute' }}>
          {visible ? (
            <ModalBottomSheet onDismissRequest={onClose} skipPartiallyExpanded>
              <ComposeRNHostView>
                <TutorCreateSheetContent {...contentProps} />
              </ComposeRNHostView>
            </ModalBottomSheet>
          ) : null}
        </ComposeHost>
      </View>
    );
  }

  return null;
}
