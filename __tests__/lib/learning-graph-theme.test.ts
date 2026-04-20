import { appTheme } from '@/constants/app-theme';
import { buildLearningGraphRuntimeTheme } from '@/lib/learning/graph-theme';

describe('learning graph runtime theme', () => {
  it('derives the graph palette from the shared app theme tokens', () => {
    expect(buildLearningGraphRuntimeTheme(appTheme)).toEqual({
      background: appTheme.colors.backgroundWorkspace,
      borderSoft: appTheme.colors.borderSoft,
      edge: 'rgba(37, 99, 235, 0.22)',
      explore: appTheme.colors.markerHighlightOrange,
      fragment: appTheme.colors.markerHighlightRed,
      primary: appTheme.colors.availabilityPickup,
      source: appTheme.colors.markerHighlightGreen,
      step: appTheme.colors.markerHighlightYellow,
      success: appTheme.colors.availabilityReady,
      surface: appTheme.colors.surface,
      text: appTheme.colors.text,
      textSoft: appTheme.colors.textSoft,
      warning: appTheme.colors.markerHighlightYellow,
    });
  });
});
