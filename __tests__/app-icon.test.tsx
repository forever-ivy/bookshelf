import { render } from '@testing-library/react-native';

import { AppIcon } from '@/components/base/app-icon';

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text: MockText } = require('react-native');

  const createIcon = (name: string) =>
    function MockLucideIcon(props: { color?: string; size?: number; strokeWidth?: number }) {
      return (
        <MockText testID={`lucide-${name.toLowerCase()}`}>
          {JSON.stringify({
            color: props.color,
            size: props.size,
            strokeWidth: props.strokeWidth,
          })}
        </MockText>
      );
    };

  return {
    BarChart3: createIcon('BarChart3'),
    ChevronLeft: createIcon('ChevronLeft'),
    House: createIcon('House'),
    Info: createIcon('Info'),
    LibraryBig: createIcon('LibraryBig'),
    PanelsTopLeft: createIcon('PanelsTopLeft'),
    QrCode: createIcon('QrCode'),
    Search: createIcon('Search'),
    Settings2: createIcon('Settings2'),
    Share2: createIcon('Share2'),
    Sparkles: createIcon('Sparkles'),
  };
});

describe('AppIcon', () => {
  it('renders lucide house icon for home', () => {
    const screen = render(<AppIcon color="#123456" name="home" size={18} strokeWidth={2.2} />);

    expect(screen.getByTestId('lucide-house')).toBeTruthy();
  });

  it('renders lucide qr code icon for qr', () => {
    const screen = render(<AppIcon name="qr" />);

    expect(screen.getByTestId('lucide-qrcode')).toBeTruthy();
  });
});
