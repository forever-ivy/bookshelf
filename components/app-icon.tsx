import React from 'react';
import {
  BarChart3,
  ChevronLeft,
  House,
  Info,
  LibraryBig,
  PanelsTopLeft,
  QrCode,
  Search,
  Settings2,
  Share2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';

export type AppIconName =
  | 'home'
  | 'book'
  | 'chart'
  | 'settings'
  | 'search'
  | 'back'
  | 'qr'
  | 'info'
  | 'cabinet'
  | 'share'
  | 'spark';

type AppIconProps = {
  color?: string;
  name: AppIconName;
  size?: number;
  strokeWidth?: number;
};

const iconByName: Record<AppIconName, LucideIcon> = {
  back: ChevronLeft,
  book: LibraryBig,
  cabinet: PanelsTopLeft,
  chart: BarChart3,
  home: House,
  info: Info,
  qr: QrCode,
  search: Search,
  settings: Settings2,
  share: Share2,
  spark: Sparkles,
};

export function AppIcon({
  color = '#0F172A',
  name,
  size = 20,
  strokeWidth = 1.8,
}: AppIconProps) {
  const IconComponent = iconByName[name];

  return (
    <IconComponent
      absoluteStrokeWidth
      color={color}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}
