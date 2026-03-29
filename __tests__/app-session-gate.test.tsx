import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

jest.mock('expo-router', () => {
  const React = require('react');

  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement('redirect', {
        href,
        testID: 'route-redirect',
      }),
  };
});

import { AppSessionGate } from '@/components/navigation/app-session-gate';

describe('AppSessionGate', () => {
  it('redirects anonymous users to login', () => {
    render(
      <AppSessionGate
        sessionState={{
          bootstrapStatus: 'ready',
          identity: null,
          onboarding: null,
          profile: null,
          token: null,
        }}>
        <Text>protected</Text>
      </AppSessionGate>
    );

    expect(screen.getByTestId('route-redirect').props.href).toBe('/login');
  });

  it('redirects users who still need profile binding', () => {
    render(
      <AppSessionGate
        sessionState={{
          bootstrapStatus: 'ready',
          identity: null,
          onboarding: {
            completed: false,
            needsInterestSelection: false,
            needsProfileBinding: true,
          },
          profile: null,
          token: 'reader-token',
        }}>
        <Text>protected</Text>
      </AppSessionGate>
    );

    expect(screen.getByTestId('route-redirect').props.href).toBe('/onboarding/profile');
  });

  it('redirects users who still need interest selection', () => {
    render(
      <AppSessionGate
        sessionState={{
          bootstrapStatus: 'ready',
          identity: null,
          onboarding: {
            completed: false,
            needsInterestSelection: true,
            needsProfileBinding: false,
          },
          profile: null,
          token: 'reader-token',
        }}>
        <Text>protected</Text>
      </AppSessionGate>
    );

    expect(screen.getByTestId('route-redirect').props.href).toBe('/onboarding/interests');
  });

  it('renders children when the session is ready and onboarding is complete', () => {
    render(
      <AppSessionGate
        sessionState={{
          bootstrapStatus: 'ready',
          identity: null,
          onboarding: {
            completed: true,
            needsInterestSelection: false,
            needsProfileBinding: false,
          },
          profile: null,
          token: 'reader-token',
        }}>
        <Text>protected</Text>
      </AppSessionGate>
    );

    expect(screen.getByText('protected')).toBeTruthy();
  });
});
