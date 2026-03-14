import React from 'react';
import { render, within } from '@testing-library/react-native';

import { MilestoneBadge, MilestoneRail } from '@/components/cards/milestone';

describe('MilestoneBadge', () => {
  it('renders a haloed image badge with a friendly label for known milestone keys', () => {
    const screen = render(<MilestoneBadge badgeKey="first_book" />);

    const badge = screen.getByTestId('milestone-badge');
    const halo = screen.getByTestId('milestone-badge-halo');
    const image = screen.getByTestId('milestone-badge-image');

    expect(badge).toBeTruthy();
    expect(halo).toBeTruthy();
    expect(image.props.source).toBeTruthy();
    expect(within(badge).getByText('首次借阅')).toBeTruthy();
  });

  it('falls back to the raw badge key when no presentation metadata exists', () => {
    const screen = render(<MilestoneBadge badgeKey="mystery_badge" />);

    expect(screen.getByText('mystery_badge')).toBeTruthy();
  });

  it('renders larger milestone cards in a horizontally scrollable rail', () => {
    const screen = render(
      <MilestoneRail
        badges={[
          { badge_key: 'first_book', unlocked_at: '2026-03-01T10:00:00.000Z' },
          { badge_key: 'night_owl', unlocked_at: '2026-03-02T10:00:00.000Z' },
        ]}
      />
    );

    const rail = screen.getByTestId('milestone-rail');
    const cards = screen.getAllByTestId('milestone-badge');

    expect(rail.props.horizontal).toBe(true);
    expect(cards[0].props.style.width).toBe(152);
    expect(screen.getByText('首次借阅')).toBeTruthy();
    expect(screen.getByText('夜读小将')).toBeTruthy();
  });
});
