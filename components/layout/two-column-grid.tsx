import React from 'react';
import { View } from 'react-native';

type TwoColumnGridProps = {
  children: React.ReactNode;
  gap?: number;
};

export function TwoColumnGrid({
  children,
  gap = 12,
}: TwoColumnGridProps) {
  const items = React.Children.toArray(children).filter(Boolean);
  const rows = [];

  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }

  return (
    <View style={{ gap }}>
      {rows.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={{ alignItems: 'flex-start', flexDirection: 'row', gap }}
          testID={`two-column-grid-row-${rowIndex}`}>
          {row.map((child, columnIndex) => (
            <View
              key={`cell-${rowIndex}-${columnIndex}`}
              style={{ flex: 1 }}>
              {child}
            </View>
          ))}
          {row.length === 1 ? (
            <View
              style={{ flex: 1 }}
              testID={`two-column-grid-spacer-${rowIndex}`}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
