import { fireEvent, render } from '@testing-library/react-native';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';

describe('PrimaryActionButton', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    const screen = render(<PrimaryActionButton label="Scan QR Code" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(screen.getByText('Scan QR Code')).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the native liquid glass host in the normal layout flow', () => {
    const screen = render(<PrimaryActionButton label="添加到书单" onPress={jest.fn()} />);

    const button = screen.getByTestId('glass-action-button-native-host');
    const resolvedStyle =
      typeof button.props.style === 'function'
        ? button.props.style({ pressed: false })
        : button.props.style;

    expect(resolvedStyle).toMatchObject({
      alignSelf: 'stretch',
      minHeight: 56,
    });
  });

  it('shows disabled state without calling onPress', () => {
    const onPress = jest.fn();
    const screen = render(
      <PrimaryActionButton disabled label="Pairing..." onPress={onPress} />
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading state and blocks presses while loading', () => {
    const onPress = jest.fn();
    const screen = render(
      <PrimaryActionButton label="继续" loading onPress={onPress} />
    );

    fireEvent.press(screen.getByRole('button'));

    expect(screen.getByText('继续')).toBeTruthy();
    expect(screen.getByTestId('glass-action-button-spinner')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityState.disabled).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });
});
