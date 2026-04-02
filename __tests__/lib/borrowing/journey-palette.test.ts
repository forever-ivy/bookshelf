import { appTheme } from '@/constants/app-theme';
import { getJourneyTonePalette } from '@/lib/borrowing/journey-palette';

describe('getJourneyTonePalette', () => {
  it('maps success tone to the vivid completion green palette', () => {
    expect(getJourneyTonePalette('success', appTheme)).toEqual({
      accent: '#1F8A43',
      accentSoft: '#DCFCE7',
      border: 'rgba(31, 138, 67, 0.2)',
    });
  });
});
