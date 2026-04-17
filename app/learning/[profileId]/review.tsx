import { CheckCircle2, ChevronRight, Target } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { GlassSurface } from '@/components/base/glass-surface';
import { LearningWorkspaceScaffold } from '@/components/learning/learning-workspace-scaffold';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLearningReport } from '@/lib/api/learning';

type IconComponent = React.ComponentType<Record<string, unknown>>;

const CheckCircleIcon = CheckCircle2 as IconComponent;
const ChevronRightIcon = ChevronRight as IconComponent;
const TargetIcon = Target as IconComponent;

export default function LearningWorkspaceReviewScreen() {
  const { theme } = useAppTheme();
  const { token } = useAppSession();
  const { navigateToMode, profile, workspaceSession } = useLearningWorkspaceScreen();

  const { data: reportData } = useQuery({
    queryKey: ['learning', 'report', workspaceSession?.id],
    queryFn: () => getLearningReport(workspaceSession!.id, token),
    enabled: !!workspaceSession?.id && !!token,
  });

  const totalSteps = profile?.curriculum.length || 1;
  const completedSteps = workspaceSession?.completedStepsCount || 0;
  const sessionMastery = reportData?.report?.masteryScore ?? reportData?.masteryScore ?? null;
  const progressRatio = sessionMastery != null ? sessionMastery / 100 : completedSteps / totalSteps;

  return (
    <LearningWorkspaceScaffold mode="review">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryContainer}>
          <Text
            style={[
              styles.summaryTitle,
              { color: theme.colors.textSoft, fontFamily: theme.typography.semiBold.fontFamily },
            ]}>
            CURRENT MASTERY
          </Text>
          <View style={styles.masteryScoreRow}>
            <Text
              style={[
                styles.masteryValue,
                { color: theme.colors.text, fontFamily: theme.typography.bold.fontFamily },
              ]}>
              {Math.round(progressRatio * 100)}
            </Text>
            <Text
              style={[
                styles.masteryPercent,
                { color: theme.colors.textSoft, fontFamily: theme.typography.semiBold.fontFamily },
              ]}>
              %
            </Text>
          </View>
          <View
            style={[
              styles.progressBarBg,
              { backgroundColor: theme.colors.borderSoft },
            ]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: theme.colors.primaryStrong, width: `${progressRatio * 100}%` },
              ]}
            />
          </View>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, fontFamily: theme.typography.bold.fontFamily },
          ]}>
          Completed Milestones
        </Text>
        <GlassSurface
          style={[
            styles.stepsCard,
            { backgroundColor: theme.colors.surface },
          ]}
          tintColor={theme.colors.surfaceTint}>
          {profile?.curriculum.map((step, index) => {
            const isCompleted = index < completedSteps;
            const isCurrent = index === completedSteps;

            return (
              <View
                key={step.id ?? index}
                style={[
                  styles.stepRow,
                  index !== 0 && {
                    borderTopColor: theme.colors.borderSoft,
                    borderTopWidth: 1,
                  },
                ]}>
                <View style={styles.stepIcon}>
                  {isCompleted ? (
                    <CheckCircleIcon color={theme.colors.success} size={22} />
                  ) : isCurrent ? (
                    <TargetIcon color={theme.colors.primaryStrong} size={22} />
                  ) : (
                    <View style={[styles.emptyCircle, { borderColor: theme.colors.textSoft }]} />
                  )}
                </View>
                <View style={styles.stepInfo}>
                  <Text
                    style={[
                      styles.stepTitleText,
                      {
                        color:
                          isCompleted || isCurrent ? theme.colors.text : theme.colors.textSoft,
                        fontFamily: theme.typography.semiBold.fontFamily,
                      },
                    ]}>
                    {step.title}
                  </Text>
                </View>
              </View>
            );
          })}
        </GlassSurface>

        {(reportData?.report?.weakPoints ?? reportData?.weakPoints ?? []).length > 0 ? (
          <View style={styles.weakPointsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.warning, fontSize: 18 }]}>
              需要加强 (Weak Points)
            </Text>
            {(reportData?.report?.weakPoints ?? reportData?.weakPoints ?? []).map(
              (concept: string, index: number) => (
                <Text
                  key={`${concept}-${index}`}
                  style={{
                    color: theme.colors.text,
                    fontFamily: theme.typography.semiBold.fontFamily,
                    marginVertical: 4,
                  }}>
                  • {concept}
                </Text>
              )
            )}
          </View>
        ) : null}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.text,
              fontFamily: theme.typography.bold.fontFamily,
              marginTop: 40,
            },
          ]}>
          Next Recommended Action
        </Text>
        <TouchableOpacity activeOpacity={0.82} onPress={() => navigateToMode('guide')}>
          <GlassSurface
            style={[
              styles.nextActionCard,
              { backgroundColor: theme.colors.primaryStrong },
            ]}
            tintColor={theme.colors.primary}>
            <View style={styles.nextTextInfo}>
              <Text
                style={[
                  styles.nextActionLabel,
                  {
                    color: 'rgba(255,255,255,0.8)',
                    fontFamily: theme.typography.semiBold.fontFamily,
                  },
                ]}>
                {workspaceSession?.currentStepTitle ?? '返回主线'}
              </Text>
              <Text
                style={[
                  styles.nextActionDesc,
                  { color: '#FFF', fontFamily: theme.typography.bold.fontFamily },
                ]}>
                Continue the Guide
              </Text>
            </View>
            <View style={styles.nextActionChevron}>
              <ChevronRightIcon color="#FFF" size={24} />
            </View>
          </GlassSurface>
        </TouchableOpacity>
      </ScrollView>
    </LearningWorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  emptyCircle: {
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    opacity: 0.3,
    width: 22,
  },
  masteryPercent: {
    fontSize: 32,
    marginBottom: 8,
  },
  masteryScoreRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  masteryValue: {
    fontSize: 86,
    letterSpacing: -2,
    lineHeight: 90,
  },
  nextActionCard: {
    alignItems: 'center',
    borderRadius: 24,
    flexDirection: 'row',
    padding: 24,
  },
  nextActionChevron: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  nextActionDesc: {
    fontSize: 22,
    marginTop: 4,
  },
  nextActionLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nextTextInfo: {
    flex: 1,
    marginRight: 16,
  },
  progressBarBg: {
    borderRadius: 8,
    height: 12,
    marginTop: 20,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    borderRadius: 8,
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  stepIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  stepInfo: {
    flex: 1,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 16,
  },
  stepsCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
  },
  stepTitleText: {
    fontSize: 16,
  },
  summaryContainer: {
    marginBottom: 40,
  },
  summaryTitle: {
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  weakPointsSection: {
    marginTop: 24,
    paddingHorizontal: 4,
  },
});
