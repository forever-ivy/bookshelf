import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { TutorCreateSheet } from '@/components/tutor/tutor-create-sheet';

describe('tutor create sheet layout', () => {
  it('keeps the sheet focused on picking a document for upload-based tutor creation', () => {
    render(
      <TutorCreateSheet
        creating={false}
        onClose={jest.fn()}
        onDocumentPicked={jest.fn()}
        visible
      />
    );

    expect(screen.getByText('创建学习导师')).toBeTruthy();
    expect(screen.getByText('上传资料')).toBeTruthy();
    expect(screen.queryByTestId('tutor-style-card-custom')).toBeNull();
    expect(screen.queryByPlaceholderText('例如：用轻松幽默的方式讲解，多举生活中的例子…')).toBeNull();

    fireEvent.press(screen.getByText('选择文件'));

    expect(screen.getByText('支持 PDF、Markdown、TXT')).toBeTruthy();
  });
});
