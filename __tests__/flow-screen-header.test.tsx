import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

describe('FlowScreenHeader', () => {
  beforeEach(() => {
    mockBack.mockClear();
  });

  it('shows the back button by default', () => {
    const screen = render(
      <FlowScreenHeader description="描述" title="标题" />
    );

    fireEvent.press(screen.getByLabelText('返回'));

    expect(screen.getByLabelText('返回')).toBeTruthy();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('hides the back button when disabled', () => {
    const screen = render(
      <FlowScreenHeader description="描述" showBackButton={false} title="标题" />
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByLabelText('返回')).toBeNull();
  });
});
