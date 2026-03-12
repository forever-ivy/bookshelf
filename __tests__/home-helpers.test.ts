import { buildCabinetStatusSummary, getTimeBasedGreeting } from '@/lib/home-helpers';

describe('buildCabinetStatusSummary', () => {
  it('counts occupied and free compartments', () => {
    const summary = buildCabinetStatusSummary(
      [
        { cid: 1, status: 'occupied', x: 0, y: 0, book: 'One' },
        { cid: 2, status: 'free', x: 1, y: 0, book: null },
        { cid: 3, status: 'occupied', x: 2, y: 0, book: 'Three' },
      ],
      'Living Room'
    );

    expect(summary.connectedLabel).toBe('书柜已连接');
    expect(summary.locationLabel).toBe('客厅');
    expect(summary.totalCompartments).toBe(3);
    expect(summary.usedCompartments).toBe(2);
    expect(summary.totalBooks).toBe(2);
  });
});

describe('getTimeBasedGreeting', () => {
  it('returns morning before noon', () => {
    expect(getTimeBasedGreeting(new Date('2026-03-12T09:00:00'))).toBe('早上好');
  });

  it('returns evening after 18:00', () => {
    expect(getTimeBasedGreeting(new Date('2026-03-12T19:30:00'))).toBe('晚上好');
  });
});
