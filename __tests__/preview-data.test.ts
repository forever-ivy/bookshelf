import { getPreviewCabinetData } from '@/lib/app/preview-data';

describe('getPreviewCabinetData', () => {
  it('returns a complete preview payload for UI-only navigation', () => {
    const preview = getPreviewCabinetData();

    expect(preview.users.length).toBeGreaterThanOrEqual(2);
    expect(preview.currentUser.name).toBeTruthy();
    expect(preview.compartments.length).toBeGreaterThan(0);
    expect(preview.stats.weekly_goal).toBeGreaterThan(0);
    expect(preview.booklist.length).toBeGreaterThan(0);
    expect(preview.weeklyReport.summary).toBeTruthy();
    expect(preview.monthlyReport.summary).toBeTruthy();
  });
});
