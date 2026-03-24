import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppProviders } from '@/providers/app-providers';

describe('AppProviders', () => {
  it('renders children inside the provider tree', () => {
    render(
      <AppProviders>
        <Text>foundation-ready</Text>
      </AppProviders>
    );

    expect(screen.getByText('foundation-ready')).toBeTruthy();
  });
});
