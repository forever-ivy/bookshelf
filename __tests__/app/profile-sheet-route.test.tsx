import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import ProfileSheetRoute from '@/app/profile-sheet';

const mockBack = jest.fn();
const mockProfileSheetContent = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock('@/components/profile/profile-sheet-content', () => ({
  ProfileSheetContent: (props: { onDismiss: () => void; scrollMode?: 'external-native' | 'react-native' }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');

    mockProfileSheetContent(props);

    return React.createElement(
      Pressable,
      {
        onPress: props.onDismiss,
        testID: 'profile-sheet-route-dismiss',
      },
      React.createElement(Text, null, '个人中心')
    );
  },
}));

describe('ProfileSheetRoute', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockProfileSheetContent.mockReset();
  });

  it('renders the shared profile sheet content as a route-backed Expo form sheet', () => {
    render(<ProfileSheetRoute />);

    expect(screen.getByText('个人中心')).toBeTruthy();
    expect(mockProfileSheetContent).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollMode: 'react-native',
      })
    );

    fireEvent.press(screen.getByTestId('profile-sheet-route-dismiss'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
