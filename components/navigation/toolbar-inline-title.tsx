import React from 'react';
import { ToolbarHeaderRow } from '@/components/navigation/toolbar-header-row';

export function ToolbarInlineTitle({ title }: { title: string }) {
  return <ToolbarHeaderRow title={title} />;
}
