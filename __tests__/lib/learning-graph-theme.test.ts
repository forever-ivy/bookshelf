import { appTheme } from '@/constants/app-theme';
import { buildLearningGraphRuntimeTheme } from '@/lib/learning/graph-theme';

describe('learning graph runtime theme', () => {
  it('derives the graph palette from the shared app theme tokens', () => {
    expect(buildLearningGraphRuntimeTheme(appTheme)).toEqual({
      background: appTheme.colors.backgroundWorkspace,
      borderSoft: appTheme.colors.borderSoft,
      edge: 'rgba(37, 99, 235, 0.3)',
      explore: '#ffc37b',
      fragment: '#ff9ea7',
      primary: '#2066ff',
      source: '#b9f09e',
      step: '#fdba03',
      success: '#0f9a3e',
      surface: appTheme.colors.surface,
      text: appTheme.colors.text,
      textSoft: appTheme.colors.textSoft,
      warning: '#f3b302',
    });
  });
});
