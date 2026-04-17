import { ArrowUp, Compass, Flag } from 'lucide-react-native';
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

import { GlassSurface } from '@/components/base/glass-surface';
import { LearningChatBubble } from '@/components/learning/learning-chat-bubble';
import { LearningWorkspaceScaffold } from '@/components/learning/learning-workspace-scaffold';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { submitLearningBridgeAction } from '@/lib/api/learning';

type IconComponent = React.ComponentType<Record<string, unknown>>;

const ArrowUpIcon = ArrowUp as IconComponent;
const CompassIcon = Compass as IconComponent;
const FlagIcon = Flag as IconComponent;

export default function LearningWorkspaceGuideScreen() {
  const { theme } = useAppTheme();
  const { token } = useAppSession();
  const {
    draft,
    handleSend,
    latestEvaluation,
    navigateToMode,
    renderedMessages,
    setDraft,
    workspaceSession,
  } = useLearningWorkspaceScreen();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const handleExploreBridge = async () => {
    if (workspaceSession?.id) {
      try {
        await submitLearningBridgeAction(workspaceSession.id, 'expand_step_to_explore', {}, token);
      } catch {
        // Preserve the bridge transition even if the network side effect fails.
      }
    }

    navigateToMode('explore');
  };

  const footer = (
    <View style={styles.footer}>
      <View style={styles.bridgeActionContainer}>
        <TouchableOpacity
          activeOpacity={0.82}
        onPress={handleExploreBridge}
          style={[
            styles.bridgeActionButton,
            {
              backgroundColor: theme.colors.surfaceTint,
              borderColor: theme.colors.borderSoft,
            },
          ]}>
          <CompassIcon color={theme.colors.primary} size={16} />
          <Text
            style={[
              styles.bridgeText,
              {
                color: theme.colors.primaryStrong,
                fontFamily: theme.typography.medium.fontFamily,
              },
            ]}>
            深度探索 (Explore)
          </Text>
        </TouchableOpacity>
      </View>

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
          placeholder="回复导师..."
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
    <LearningWorkspaceScaffold footer={footer} mode="guide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          ref={scrollViewRef}>
          <View
            style={[
              styles.stepSummaryCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}>
            <Text
              style={[
                styles.stepSummaryLabel,
                {
                  color: theme.colors.textSoft,
                  fontFamily: theme.typography.semiBold.fontFamily,
                },
              ]}>
              当前学习步骤
            </Text>
            <Text
              style={[
                styles.stepSummaryTitle,
                {
                  color: theme.colors.text,
                  fontFamily: theme.typography.bold.fontFamily,
                },
              ]}>
              {workspaceSession?.currentStepTitle ?? '当前学习步骤'}
            </Text>
          </View>

          <View style={styles.messagesContainer}>
            {renderedMessages.map((message) => (
              <LearningChatBubble
                key={message.id}
                role={message.role}
                streaming={message.streaming}
                text={message.text}
              />
            ))}

            {latestEvaluation ? (
              <GlassSurface
                style={[
                  styles.evaluationCard,
                  {
                    backgroundColor: latestEvaluation.passed
                      ? theme.colors.availabilityReadySoft
                      : theme.colors.availabilityUnavailableSoft,
                    borderColor: latestEvaluation.passed
                      ? theme.colors.availabilityReady
                      : theme.colors.warning,
                  },
                ]}>
                <View style={styles.evaluationRow}>
                  <FlagIcon
                    color={latestEvaluation.passed ? theme.colors.success : theme.colors.warning}
                    size={20}
                  />
                  <Text
                    style={[
                      styles.evaluationText,
                      {
                        color: latestEvaluation.passed ? theme.colors.success : theme.colors.warning,
                      },
                    ]}>
                    {latestEvaluation.feedback}
                  </Text>
                </View>
              </GlassSurface>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LearningWorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  bridgeActionButton: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bridgeActionContainer: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bridgeText: {
    fontSize: 13,
  },
  evaluationCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    padding: 16,
  },
  evaluationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  evaluationText: {
    flex: 1,
    fontSize: 15,
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
  stepSummaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  stepSummaryLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  stepSummaryTitle: {
    fontSize: 20,
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
