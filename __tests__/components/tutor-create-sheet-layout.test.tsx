import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { TutorCreateSheet } from '@/components/tutor/tutor-create-sheet';

describe('tutor create sheet layout', () => {
  it('keeps the custom style card compact and shows the prompt editor in a separate panel', () => {
    render(
      <TutorCreateSheet
        onClose={jest.fn()}
        onCreateWithStyle={jest.fn()}
        onDocumentPicked={jest.fn()}
        visible
      />
    );

    fireEvent.press(screen.getByTestId('tutor-style-card-custom'));

    expect(screen.getByTestId('tutor-style-card-custom')).toBeTruthy();
    expect(screen.getByTestId('tutor-style-custom-prompt-panel')).toBeTruthy();
    expect(screen.getByPlaceholderText('例如：用轻松幽默的方式讲解，多举生活中的例子…')).toBeTruthy();
  });
});
