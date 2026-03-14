import React from 'react';
import { render } from '@testing-library/react-native';

import { StateCard } from '@/components/surfaces/state-card';

describe('StateCard', () => {
  it('renders the supplied content for warning and success states', () => {
    const warningScreen = render(
      <StateCard
        description="Preview mode keeps the layout but blocks the real action."
        title="Preview only"
        variant="warning"
      />
    );

    expect(warningScreen.getByText('Preview only')).toBeTruthy();
    expect(
      warningScreen.getByText('Preview mode keeps the layout but blocks the real action.')
    ).toBeTruthy();

    const successScreen = render(
      <StateCard
        description="The cabinet has responded successfully."
        icon="check"
        title="Action complete"
        variant="success"
      />
    );

    expect(successScreen.getByText('Action complete')).toBeTruthy();
    expect(successScreen.getByText('The cabinet has responded successfully.')).toBeTruthy();
  });
});
