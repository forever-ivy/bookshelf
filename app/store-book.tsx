import React from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Redirect } from 'expo-router';

import { FieldInput } from '@/components/base/field-input';
import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { useOcrIngestMutation } from '@/lib/api/react-query/hooks';
import {
  resolveImagePickerModule,
  type ImagePickerAsset,
} from '@/lib/app/optional-image-picker';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

function createImageFormData(asset: ImagePickerAsset) {
  const formData = new FormData();

  if (asset.file) {
    formData.append('image', asset.file);
    return formData;
  }

  formData.append('image', {
    name: asset.fileName ?? 'bookleaf-store.jpg',
    type: asset.mimeType ?? 'image/jpeg',
    uri: asset.uri,
  } as never);

  return formData;
}

export default function StoreBookScreen() {
  const connection = useSessionStore((state) => state.connection);
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const ocrIngestMutation = useOcrIngestMutation();
  const imagePicker = React.useMemo(() => resolveImagePickerModule(), []);
  const [selectedAsset, setSelectedAsset] = React.useState<ImagePickerAsset | null>(null);
  const [lastReply, setLastReply] = React.useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = React.useState<string | null>(null);
  const [readingHint, setReadingHint] = React.useState('');

  if (!connection) {
    return <Redirect href="/connect" />;
  }

  async function openCamera() {
    if (!imagePicker) {
      setPermissionMessage(
        '当前运行时还没有可用的拍照/相册模块。请完全重启 Expo，或重建 Dev Client 后再试。'
      );
      return;
    }

    const granted = await imagePicker.requestCameraPermissionsAsync();

    if (!granted.granted) {
      setPermissionMessage('请先开启相机权限，Bookleaf 才能帮你拍照识别书脊。');
      return;
    }

    const result = await imagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });

    if (!result.canceled) {
      setPermissionMessage(null);
      setSelectedAsset(result.assets[0]);
    }
  }

  async function openLibrary() {
    if (!imagePicker) {
      setPermissionMessage(
        '当前运行时还没有可用的拍照/相册模块。请完全重启 Expo，或重建 Dev Client 后再试。'
      );
      return;
    }

    const granted = await imagePicker.requestMediaLibraryPermissionsAsync();

    if (!granted.granted) {
      setPermissionMessage('请先允许访问照片，这样你才能从相册里选择一本书的照片。');
      return;
    }

    const result = await imagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.9,
      selectionLimit: 1,
    });

    if (!result.canceled) {
      setPermissionMessage(null);
      setSelectedAsset(result.assets[0]);
    }
  }

  return (
    <ScreenShell contentContainerStyle={{ gap: 20 }}>
      <Animated.View entering={createStaggeredFadeIn(0)}>
        <FlowScreenHeader
          description="拍一本书的封面或书脊，再交给 OCR 存书流程，把它稳稳放回家庭书架。"
          title="存书"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="你可以现场拍照，也可以从相册里选一张更清晰的照片。"
          title="选择照片">
          {isPreviewMode ? (
            <StateCard
              description="预览模式只展示选图和识别反馈布局，不会真的提交到书柜。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          {!imagePicker ? (
            <StateCard
              description="这通常说明当前原生运行时还是旧版本，新的 image picker native module 还没装进去。先完全重启 Expo，若你在用 Dev Client，请重新构建一次。"
              title="拍照模块暂时不可用"
              variant="warning"
            />
          ) : null}
          {permissionMessage ? (
            <StateCard
              description={permissionMessage}
              title="需要权限"
              variant="warning"
            />
          ) : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <PrimaryActionButton
                label="拍照识别"
                onPress={openCamera}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryActionButton
                label="从相册选择"
                onPress={openLibrary}
                variant="ghost"
              />
            </View>
          </View>
          {selectedAsset ? (
            <View style={{ gap: 12 }}>
              <Image
                contentFit="cover"
                source={{ uri: selectedAsset.uri }}
                style={{
                  borderRadius: bookleafTheme.radii.lg,
                  height: 240,
                  width: '100%',
                }}
              />
              <Text
                selectable
                style={{
                  color: bookleafTheme.colors.textMuted,
                  ...bookleafTheme.typography.body,
                  fontSize: 13,
                  lineHeight: 18,
                }}>
                {selectedAsset.fileName ?? '已选照片'} · {selectedAsset.width} × {selectedAsset.height}
              </Text>
            </View>
          ) : (
            <StateCard
              description="选定照片之后，这里会先展示一张预览，再让你发起 OCR 存书。"
              title="还没有选照片"
            />
          )}
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
        <SectionCard
          description="这里不做复杂的图书后台，只保留前台家庭使用最需要的识别反馈。"
          title="识别与反馈">
          <FieldInput
            hint="这是给你的家庭备注，不会上传到后端。"
            label="这次想记住什么"
            multiline
            onChangeText={setReadingHint}
            placeholder="例如：这本书是今晚睡前故事。"
            value={readingHint}
          />
          <PrimaryActionButton
            disabled={isPreviewMode || !selectedAsset}
            label="识别并放回书架"
            loading={ocrIngestMutation.isPending}
            onPress={async () => {
              if (!selectedAsset) {
                return;
              }

              const result = await ocrIngestMutation.mutateAsync({
                formData: createImageFormData(selectedAsset),
              });
              setLastReply(
                result.reply ??
                  result.ai_reply ??
                  (readingHint.trim()
                    ? `这次存书备注已记录：${readingHint.trim()}`
                    : '书柜已经收到这次存书请求。')
              );
            }}
          />
          {ocrIngestMutation.error ? (
            <StateCard
              description={ocrIngestMutation.error.message}
              title="识别没有成功"
              variant="error"
            />
          ) : null}
          {lastReply ? (
            <StateCard
              description={lastReply}
              icon="check"
              title="书柜已经给出反馈"
              variant="success"
            />
          ) : null}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
