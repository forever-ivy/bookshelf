import { fireEvent, render } from '@testing-library/react-native';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';

describe('PrimaryActionButton', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    const screen = render(<PrimaryActionButton label="Scan QR Code" onPress={onPress} />);

    fireEvent.press(screen.getByText('Scan QR Code'));

    expect(screen.getByText('Scan QR Code')).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows disabled state without calling onPress', () => {
    const onPress = jest.fn();
    const screen = render(
      <PrimaryActionButton disabled label="Pairing..." onPress={onPress} />
    );

    fireEvent.press(screen.getByText('Pairing...'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading state and blocks presses while loading', () => {
    const onPress = jest.fn();
    const screen = render(
      <PrimaryActionButton label="继续" loading onPress={onPress} />
    );

    fireEvent.press(screen.getByText('继续'));

    expect(screen.getByText('继续')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
    expect(onPress).not.toHaveBeenCalled();
  });
});
