import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { FloatingBottomNav } from '@/components/navigation/floating-bottom-nav';
import { bookleafTheme } from '@/constants/bookleaf-theme';

jest.mock('@/components/base/app-icon', () => {
  const React = require('react');
  const { Text: MockText } = require('react-native');

  return {
    AppIcon: ({
      color,
      name,
    }: {
      color: string;
      name: string;
    }) => <MockText>{`${name}:${color}`}</MockText>,
  };
});

const items = [
  { key: 'home', label: '首页', icon: 'home' },
  { key: 'library', label: '书库', icon: 'book' },
  { key: 'reports', label: '报告', icon: 'chart' },
  { key: 'settings', label: '设置', icon: 'settings' },
] as const;

describe('FloatingBottomNav', () => {
  it('renders every navigation label', () => {
    const screen = render(
      <FloatingBottomNav activeKey="home" items={items} onSelect={jest.fn()} />
    );

    expect(screen.getByText('首页')).toBeTruthy();
    expect(screen.getByText('书库')).toBeTruthy();
    expect(screen.getByText('报告')).toBeTruthy();
    expect(screen.getByText('设置')).toBeTruthy();
  });

  it('calls onSelect with the tapped item key', () => {
    const onSelect = jest.fn();
    const screen = render(
      <FloatingBottomNav activeKey="home" items={items} onSelect={onSelect} />
    );

    fireEvent.press(screen.getByText('报告'));

    expect(onSelect).toHaveBeenCalledWith('reports');
  });

  it('marks the active tab as selected', () => {
    const screen = render(
      <FloatingBottomNav activeKey="reports" items={items} onSelect={jest.fn()} />
    );

    expect(screen.getByRole('tab', { name: '报告' }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByRole('tab', { name: '首页' }).props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('adds long-press handling for iOS-style magnification feedback', () => {
    const screen = render(
      <FloatingBottomNav activeKey="home" items={items} onSelect={jest.fn()} />
    );

    const tabs = screen.UNSAFE_getAllByProps({ accessibilityRole: 'tab' });

    expect(tabs[0]?.props.onLongPress).toEqual(expect.any(Function));
  });

  it('uses restrained glass foreground colors for active and inactive icons', () => {
    const screen = render(
      <FloatingBottomNav activeKey="home" items={items} onSelect={jest.fn()} />
    );

    expect(screen.getByText(`home:${bookleafTheme.colors.glassForegroundActive}`)).toBeTruthy();
    expect(screen.getByText(`book:${bookleafTheme.colors.glassForeground}`)).toBeTruthy();
  });

  it('renders a local frosted patch under the active item', () => {
    const screen = render(
      <FloatingBottomNav activeKey="home" items={items} onSelect={jest.fn()} />
    );

    const patch = screen.getByTestId('active-nav-frosted-patch');
    const flattenedStyle = StyleSheet.flatten(patch.props.style);

    expect(patch).toBeTruthy();
    expect(flattenedStyle?.backgroundColor).toBe('rgba(255,255,255,0.18)');
    expect(flattenedStyle?.borderColor).toBe('rgba(255,255,255,0.24)');
  });
});
