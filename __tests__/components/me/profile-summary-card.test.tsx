import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ProfileSummaryCard } from '@/components/me/profile-summary-card';

jest.mock('@/components/base/pill-button', () => ({
  PillButton: ({ label }: { label: string }) => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, null, label);
  },
}));

describe('ProfileSummaryCard', () => {
  it('renders the profile summary inside the glass surface shell', () => {
    render(<ProfileSummaryCard />);

    expect(screen.getByText('陈知行')).toBeTruthy();
    expect(screen.getByText('阅读偏好')).toBeTruthy();
    expect(screen.getByText('打开个人中心')).toBeTruthy();
  });
});
