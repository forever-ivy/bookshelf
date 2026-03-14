import React from 'react';
import {
  BarChart3,
  Bookmark,
  Camera,
  ChevronLeft,
  Check,
  House,
  Info,
  LibraryBig,
  PanelsTopLeft,
  Pencil,
  Plus,
  QrCode,
  Search,
  Settings2,
  Share2,
  Sparkles,
  Target,
  Trash2,
  Users,
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
  | 'spark'
  | 'camera'
  | 'users'
  | 'plus'
  | 'target'
  | 'trash'
  | 'check'
  | 'edit'
  | 'bookmark';

type AppIconProps = {
  color?: string;
  name: AppIconName;
  size?: number;
  strokeWidth?: number;
};

const iconByName: Record<AppIconName, LucideIcon> = {
  back: ChevronLeft,
  bookmark: Bookmark,
  book: LibraryBig,
  cabinet: PanelsTopLeft,
  camera: Camera,
  chart: BarChart3,
  check: Check,
  edit: Pencil,
  home: House,
  info: Info,
  plus: Plus,
  qr: QrCode,
  search: Search,
  settings: Settings2,
  share: Share2,
  spark: Sparkles,
  target: Target,
  trash: Trash2,
  users: Users,
};

export function AppIcon({
  color = '#0F172A',
  name,
  size = 20,
  strokeWidth = 1.8,
}: AppIconProps) {
  const IconComponent = iconByName[name] as React.ComponentType<Record<string, unknown>>;

  return (
    <IconComponent
      absoluteStrokeWidth
      color={color}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}

export type NativeTabIconName = Extract<AppIconName, 'home' | 'book' | 'chart' | 'settings'>;

const nativeTabIconPropsByName = {
  book: {
    md: 'local_library',
    sf: {
      default: 'books.vertical.fill',
      selected: 'books.vertical.fill',
    },
  },
  chart: {
    md: 'bar_chart',
    sf: {
      default: 'chart.bar.fill',
      selected: 'chart.bar.fill',
    },
  },
  home: {
    md: 'home',
    sf: {
      default: 'house.fill',
      selected: 'house.fill',
    },
  },
  settings: {
    md: 'settings',
    sf: {
      default: 'gearshape.fill',
      selected: 'gearshape.fill',
    },
  },
} as const satisfies Record<
  NativeTabIconName,
  {
    md: string;
    sf: {
      default: string;
      selected: string;
    };
  }
>;

export function getNativeTabIconProps(name: NativeTabIconName) {
  return nativeTabIconPropsByName[name];
}
