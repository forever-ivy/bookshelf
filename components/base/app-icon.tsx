import React from 'react';
import {
  Bell,
  Bookmark,
  BookOpen,
  ChevronRight,
  CircleUserRound,
  Clock3,
  House,
  Package,
  Search,
  Sparkles,
  Truck,
  type LucideIcon,
} from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export type AppIconName =
  | 'bell'
  | 'bookmark'
  | 'borrowing'
  | 'chevronRight'
  | 'clock'
  | 'home'
  | 'package'
  | 'profile'
  | 'search'
  | 'spark'
  | 'truck';

const iconByName: Record<AppIconName, LucideIcon> = {
  bell: Bell,
  bookmark: Bookmark,
  borrowing: BookOpen,
  chevronRight: ChevronRight,
  clock: Clock3,
  home: House,
  package: Package,
  profile: CircleUserRound,
  search: Search,
  spark: Sparkles,
  truck: Truck,
};

export function AppIcon({
  color,
  name,
  size = 18,
  strokeWidth = 1.72,
}: {
  color?: string;
  name: AppIconName;
  size?: number;
  strokeWidth?: number;
}) {
  const { theme } = useAppTheme();
  const Icon = iconByName[name] as React.ComponentType<Record<string, unknown>>;

  return <Icon color={color ?? theme.colors.text} size={size} strokeWidth={strokeWidth} />;
}

export function getNativeTabIconProps(
  name: Extract<AppIconName, 'borrowing' | 'home' | 'profile' | 'search'>
) {
  switch (name) {
    case 'home':
      return {
        md: 'home',
        sf: { default: 'house.fill', selected: 'house.fill' },
      } as const;
    case 'search':
      return {
        md: 'search',
        sf: { default: 'magnifyingglass', selected: 'magnifyingglass' },
      } as const;
    case 'borrowing':
      return {
        md: 'menu_book',
        sf: { default: 'books.vertical.fill', selected: 'books.vertical.fill' },
      } as const;
    case 'profile':
      return {
        md: 'person',
        sf: { default: 'person.crop.circle.fill', selected: 'person.crop.circle.fill' },
      } as const;
  }
}
