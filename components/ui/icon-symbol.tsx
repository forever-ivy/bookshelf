import { ChevronRight, Code2, House, SendHorizontal, type LucideIcon } from 'lucide-react-native';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconSymbolName = SymbolViewProps['name'];

const MAPPING: Partial<Record<IconSymbolName, LucideIcon>> = {
  'chevron.left.forwardslash.chevron.right': Code2,
  'chevron.right': ChevronRight,
  'house.fill': House,
  'paperplane.fill': SendHorizontal,
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const IconComponent = MAPPING[name];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      absoluteStrokeWidth
      color={typeof color === 'string' ? color : '#0F172A'}
      size={size}
      strokeWidth={1.9}
    />
  );
}
