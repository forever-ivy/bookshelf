import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const AnimatedView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(View, { ...props, ref }, props.children)
  );

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
    },
    Easing: {
      bezier: jest.fn(),
      out: jest.fn(),
    },
    View: AnimatedView,
    interpolate: jest.fn(() => 1),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'mock-modal' }, children),
  };
});

import { ShelfCabinetPreview } from '@/components/cards/shelf-cabinet-preview';
import type { CabinetCompartment } from '@/lib/api/contracts/types';

const compartments: CabinetCompartment[] = [
  { book: '设计心理学', cid: 1, status: 'occupied', x: 0, y: 0 },
  { book: '人类简史', cid: 2, status: 'occupied', x: 0, y: 1 },
  { book: null, cid: 3, status: 'free', x: 0, y: 2 },
  { book: '百年孤独', cid: 4, status: 'occupied', x: 1, y: 0 },
];

describe('ShelfCabinetPreview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('maps compartments into shelf rows and renders books plus empty slots', () => {
    const screen = render(
      <ShelfCabinetPreview compartments={compartments} onTakeBook={() => {}} previewMode={false} />
    );

    expect(screen.getByTestId('shelf-row-0')).toBeTruthy();
    expect(screen.getByTestId('shelf-row-1')).toBeTruthy();
    expect(screen.getByTestId('shelf-row-2')).toBeTruthy();
    expect(screen.getByTestId('cabinet-book-1')).toBeTruthy();
    expect(screen.getByTestId('cabinet-book-2')).toBeTruthy();
    expect(screen.getByTestId('cabinet-slot-3')).toBeTruthy();
  });

  it('binds each rendered book spine to its own SVG gradient fill', () => {
    const screen = render(
      <ShelfCabinetPreview compartments={compartments} onTakeBook={() => {}} previewMode={false} />
    );

    expect(screen.UNSAFE_root.findByProps({ id: 'spine-gradient-1' })).toBeTruthy();
    expect(
      screen.UNSAFE_root.findAll(
        (node: { props: { fill?: string } }) =>
          node.props.fill === 'url(#spine-gradient-1)'
      ).length
    ).toBeGreaterThan(0);
  });

  it('renders matte grounded spines with more readable vertical titles', () => {
    const screen = render(
      <ShelfCabinetPreview compartments={compartments} onTakeBook={() => {}} previewMode={false} />
    );

    const bodyRect = screen.UNSAFE_root.find(
      (node: { props: { fill?: string; height?: number; y?: number } }) =>
        node.props.fill === 'url(#spine-gradient-1)'
    );
    expect(Number(bodyRect.props.y)).toBeLessThanOrEqual(4);
    expect(Number(bodyRect.props.height)).toBeGreaterThanOrEqual(202);

    const gradient = screen.UNSAFE_root.findByProps({ id: 'spine-gradient-1' });
    const highlightOpacities = gradient
      .findAll(
        (node: { props: { stopOpacity?: string } }) =>
          typeof node.props.stopOpacity === 'string'
      )
      .map((node: { props: { stopOpacity?: string } }) => Number(node.props.stopOpacity));
    expect(Math.max(...highlightOpacities)).toBeLessThanOrEqual(0.16);

    const svgTexts = screen.UNSAFE_root.findAll(
      (node: { props: { fontSize?: number; x?: string } }) =>
        typeof node.props.fontSize === 'number' && node.props.x === '30'
    );
    expect(svgTexts.length).toBeGreaterThan(0);
    expect(
      Math.min(
        ...svgTexts.map(
          (node: { props: { fontSize?: number } }) => Number(node.props.fontSize)
        )
      )
    ).toBeGreaterThanOrEqual(10);
  });

  it('opens the immersive preview for occupied compartments but not empty ones', () => {
    const screen = render(
      <ShelfCabinetPreview compartments={compartments} onTakeBook={() => {}} previewMode={false} />
    );

    fireEvent.press(screen.getByTestId('cabinet-slot-3'));
    expect(screen.queryByTestId('shelf-preview-modal')).toBeNull();

    fireEvent.press(screen.getByTestId('cabinet-book-1'));
    expect(screen.getByTestId('shelf-preview-modal')).toBeTruthy();
    expect(screen.getAllByText('设计心理学').length).toBeGreaterThan(0);
  });

  it('disables the take action in preview mode and shows the warning copy', () => {
    const screen = render(
      <ShelfCabinetPreview compartments={compartments} onTakeBook={() => {}} previewMode />
    );

    fireEvent.press(screen.getByTestId('cabinet-book-1'));

    expect(screen.getByText('预览模式不可操作')).toBeTruthy();
    expect(screen.getByTestId('shelf-preview-action').props.accessibilityState.disabled).toBe(true);
  });

  it('routes the take action through the modal footer button', async () => {
    const onTakeBook = jest.fn();
    const screen = render(
      <ShelfCabinetPreview compartments={compartments} onTakeBook={onTakeBook} previewMode={false} />
    );

    fireEvent.press(screen.getByTestId('cabinet-book-2'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('shelf-preview-action'));
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(onTakeBook).toHaveBeenCalledWith(
      expect.objectContaining({
        book: '人类简史',
        cid: 2,
      })
    );
  });
});
