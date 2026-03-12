import { Image } from 'expo-image';
import React from 'react';
import {
  Text,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { resolveAvatarVisual } from '@/lib/avatar-rendering';

type AvatarGlyphProps = {
  size: number;
  style?: StyleProp<TextStyle>;
  value: string;
};

export function AvatarGlyph({ size, style, value }: AvatarGlyphProps) {
  const resolved = React.useMemo(() => resolveAvatarVisual(value), [value]);
  const [imageFailed, setImageFailed] = React.useState(false);
  const imageStyle = style as StyleProp<ImageStyle>;

  React.useEffect(() => {
    setImageFailed(false);
  }, [resolved]);

  if (resolved.kind === 'image' && !imageFailed) {
    return (
      <Image
        contentFit="contain"
        onError={() => setImageFailed(true)}
        source={{ uri: resolved.uri }}
        style={[
          {
            height: size,
            width: size,
          },
          imageStyle,
        ]}
        transition={0}
      />
    );
  }

  return (
    <Text
      allowFontScaling={false}
      style={[
        {
          fontSize: size,
          lineHeight: size + 2,
          textAlign: 'center',
        },
        style,
      ]}>
      {resolved.kind === 'text' ? resolved.value : '?'}
    </Text>
  );
}
