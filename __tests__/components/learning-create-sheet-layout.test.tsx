import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { LearningCreateSheet } from '@/components/learning/learning-create-sheet';

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
    expect(screen.getByText('上传资料')).toBeTruthy();
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
});
