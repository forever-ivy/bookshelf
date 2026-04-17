import { ArrowUp, Inbox, Target } from 'lucide-react-native';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { toast } from 'sonner-native';

import { LearningChatBubble } from '@/components/learning/learning-chat-bubble';
import { LearningWorkspaceScaffold } from '@/components/learning/learning-workspace-scaffold';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { submitLearningBridgeAction } from '@/lib/api/learning';

const RELATED_PROMPTS = ['什么是核心概念?', '它和之前的步骤有关联吗?', '举个例子说明'];
type IconComponent = React.ComponentType<Record<string, unknown>>;

const ArrowUpIcon = ArrowUp as IconComponent;
const InboxIcon = Inbox as IconComponent;
const TargetIcon = Target as IconComponent;

export default function LearningWorkspaceExploreScreen() {
  const { theme } = useAppTheme();
  const { token } = useAppSession();
  const { draft, handleSend, renderedMessages, setDraft, workspaceSession } = useLearningWorkspaceScreen();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const handleCollectToGuide = async () => {
    if (workspaceSession?.id) {
      try {
        await submitLearningBridgeAction(
          workspaceSession.id,
          'attach_explore_turn_to_guide_step',
          {},
          token
        );
        toast.success(`已收录至: ${workspaceSession.currentStepTitle ?? '当前步骤'}`);
      } catch {
        toast.error('收录失败，请重试');
      }
    }
  };

  const footer = (
    <View style={styles.footer}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.relatedScrollContent}
        showsHorizontalScrollIndicator={false}
        style={styles.relatedScroll}>
        {RELATED_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            activeOpacity={0.82}
            onPress={() => handleSend(prompt)}
            style={[
              styles.relatedPill,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.borderSoft,
              },
            ]}>
            <Text
              style={[
                styles.relatedPillText,
                {
                  color: theme.colors.textSoft,
                  fontFamily: theme.typography.body.fontFamily,
                },
              ]}>
              {prompt}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}>
        <TextInput
          multiline
          onChangeText={setDraft}
          placeholder="自由探索，深入挖掘..."
          placeholderTextColor={theme.colors.textSoft}
          style={[
            styles.textInput,
            { color: theme.colors.text, fontFamily: theme.typography.body.fontFamily },
          ]}
          value={draft}
        />
        <TouchableOpacity
          accessibilityRole="button"
          disabled={!draft.trim()}
          onPress={() => handleSend(draft)}
          style={[
            styles.sendButton,
            {
              backgroundColor: draft.trim() ? theme.colors.primaryStrong : theme.colors.surfaceMuted,
            },
          ]}>
          <ArrowUpIcon color={draft.trim() ? theme.colors.surface : theme.colors.textSoft} size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LearningWorkspaceScaffold footer={footer} mode="explore">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          ref={scrollViewRef}>
          <View
            style={[
              styles.focusCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}>
            <View
              style={[
                styles.focusLabelContainer,
                { backgroundColor: theme.colors.primarySoft },
              ]}>
              <TargetIcon color={theme.colors.primaryStrong} size={14} />
              <Text
                style={[
                  styles.focusLabelText,
                  {
                    color: theme.colors.primaryStrong,
                    fontFamily: theme.typography.semiBold.fontFamily,
                  },
                ]}>
                Current Focus
              </Text>
            </View>
            <Text
              style={[
                styles.focusTitle,
                { color: theme.colors.text, fontFamily: theme.typography.bold.fontFamily },
              ]}>
              围绕 “{workspaceSession?.currentStepTitle ?? '全书'}” 发散探索
            </Text>
          </View>

          <View style={styles.messagesContainer}>
            {renderedMessages.map((message, index) => (
              <View key={message.id}>
                <LearningChatBubble
                  role={message.role}
                  streaming={message.streaming}
                  text={message.text}
                />
                {message.role === 'assistant' &&
                index === renderedMessages.length - 1 &&
                !message.streaming ? (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={handleCollectToGuide}
                      style={[
                        styles.collectButton,
                        {
                          backgroundColor: theme.colors.surfaceTint,
                          borderColor: theme.colors.borderSoft,
                        },
                      ]}>
                      <InboxIcon color={theme.colors.systemBlue} size={16} />
                      <Text
                        style={[
                          styles.collectText,
                          {
                            color: theme.colors.systemBlue,
                            fontFamily: theme.typography.medium.fontFamily,
                          },
                        ]}>
                        收编到当前步骤
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LearningWorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
  },
  collectButton: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  collectText: {
    fontSize: 13,
  },
  focusCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  focusLabelContainer: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  focusLabelText: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  focusTitle: {
    fontSize: 18,
  },
  footer: {
    gap: 8,
  },
  inputWrapper: {
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    gap: 24,
  },
  relatedPill: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  relatedPillText: {
    fontSize: 13,
  },
  relatedScroll: {
    marginBottom: 4,
  },
  relatedScrollContent: {
    gap: 8,
  },
  scrollContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginLeft: 10,
    width: 36,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
});
