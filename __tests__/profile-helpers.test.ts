import {
  getProfileAvatarValue,
  resolveProfileMember,
} from '@/app/(app)/profile.helpers';

describe('resolveProfileMember', () => {
  it('falls back to stats payload when the member is missing from the users query', () => {
    expect(
      resolveProfileMember([], 5, {
        avatar: '🧒',
        color: 'ocean',
        id: 5,
        name: '儿子',
        role: 'child',
      })
    ).toEqual({
      avatar: '🧒',
      color: 'ocean',
      id: 5,
      name: '儿子',
      role: 'child',
    });
  });

  it('uses the database avatar directly on profile instead of falling back to the member name', () => {
    expect(getProfileAvatarValue({ avatar: '👩' })).toBe('👩');
    expect(getProfileAvatarValue({ avatar: '' })).toBe('?');
  });
});
