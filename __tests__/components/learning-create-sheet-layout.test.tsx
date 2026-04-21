import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { appTheme } from '@/constants/app-theme';
import { LearningCreateSheet } from '@/components/learning/learning-create-sheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 24,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

describe('learning create sheet layout', () => {
  it('keeps the sheet focused on picking a document for upload-based learning creation', () => {
    render(
      <LearningCreateSheet
        creating={false}
        onClose={jest.fn()}
        onDocumentPicked={jest.fn()}
        visible
      />
    );

    expect(screen.getByText('创建学习导师')).toBeTruthy();
    expect(screen.getByText('选择文件')).toBeTruthy();
    expect(screen.getByText('支持 PDF、Markdown、TXT')).toBeTruthy();
    expect(screen.queryByTestId('learning-style-card-custom')).toBeNull();
    expect(screen.queryByPlaceholderText('例如：用轻松幽默的方式讲解，多举生活中的例子…')).toBeNull();

    fireEvent.press(screen.getByText('选择文件'));

    expect(screen.getByText('支持 PDF、Markdown、TXT')).toBeTruthy();
  });

  it('lets the native sheet own horizontal sizing instead of matching narrow content', () => {
    render(
      <LearningCreateSheet
        creating={false}
        onClose={jest.fn()}
        onDocumentPicked={jest.fn()}
        visible
      />
    );

    expect(screen.queryByTestId('learning-create-sheet-swift-scroll-view')).toBeNull();
    expect(screen.getByTestId('swift-rn-host').props.matchContents).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('learning-create-sheet-content').props.style)).toEqual(
      expect.objectContaining({
        alignSelf: 'stretch',
        flex: 1,
      })
    );
  });

  it('uses a fixed footer surface instead of an inner scroll view', () => {
    const view = render(
      <LearningCreateSheet
        creating={false}
        onClose={jest.fn()}
        onDocumentPicked={jest.fn()}
        visible
      />
    );

    const footerStyle = StyleSheet.flatten(screen.getByTestId('learning-create-sheet-footer').props.style);

    expect(view.UNSAFE_queryByType(ScrollView)).toBeNull();
    expect(screen.getByText('创建导师')).toBeTruthy();
    expect(footerStyle).toEqual(
      expect.objectContaining({
        backgroundColor: appTheme.colors.surface,
        paddingBottom: 24,
      })
    );
  });
});
