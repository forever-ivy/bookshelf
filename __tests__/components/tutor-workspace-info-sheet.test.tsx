import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { appTheme } from '@/constants/app-theme';
import { TutorWorkspaceInfoSheetContent } from '@/components/tutor/tutor-workspace-info-sheet';

describe('TutorWorkspaceInfoSheetContent', () => {
  it('adds extra top spacing before the sheet title', () => {
    const view = render(
      <TutorWorkspaceInfoSheetContent
        completedSteps={[]}
        currentStepIndex={0}
        highlightCards={[]}
        panel="path"
        sourceCards={[]}
        sourceSummary="来源摘要"
        steps={[
          {
            goal: '先建立时间轴，再进入事件意义。',
            id: 'step-1',
            title: '先搭时间主线',
          },
        ]}
      />
    );

    expect(screen.getByText('导学路径')).toBeTruthy();

    const scrollView = view.UNSAFE_getByType(ScrollView);

    expect(StyleSheet.flatten(scrollView.props.contentContainerStyle)).toEqual(
      expect.objectContaining({
        paddingTop: appTheme.spacing.xl,
      })
    );
  });
});
