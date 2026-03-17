import {
  appRoutes,
  getLibraryBookHref,
  getMemberGoalsHref,
  getMemberProfileHref,
  getSettingsAccountHref,
} from '@/lib/app/routes';

describe('app routes', () => {
  it('keeps the four public tab routes stable', () => {
    expect(appRoutes.home).toBe('/home');
    expect(appRoutes.library).toBe('/library');
    expect(appRoutes.reports).toBe('/reports');
    expect(appRoutes.settings).toBe('/settings');
  });

  it('defines grouped library and settings task routes', () => {
    expect(appRoutes.authLogin).toBe('/login');
    expect(appRoutes.authRegister).toBe('/register');
    expect(appRoutes.libraryBooks).toBe('/library/books');
    expect(appRoutes.libraryBooksNew).toBe('/library/books/new');
    expect(appRoutes.libraryShelf).toBe('/library/shelf');
    expect(appRoutes.libraryBooklist).toBe('/library/booklist');
    expect(appRoutes.libraryTakeBook).toBe('/library/take-book');
    expect(appRoutes.libraryStoreBook).toBe('/library/store-book');
    expect(appRoutes.reportsReadingEvents).toBe('/reports/reading-events');
    expect(appRoutes.settingsAccounts).toBe('/settings/accounts');
    expect(appRoutes.settingsCabinet).toBe('/settings/cabinet');
    expect(appRoutes.settingsFamily).toBe('/settings/family');
    expect(appRoutes.settingsMembers).toBe('/settings/members');
    expect(appRoutes.settingsMembersForm).toBe('/settings/members/form');
  });

  it('builds member-scoped home routes from a member id', () => {
    expect(getMemberProfileHref(7)).toBe('/home/profile/7');
    expect(getMemberGoalsHref(7)).toBe('/home/profile/7/goals');
  });

  it('builds account and book detail routes from entity ids', () => {
    expect(getSettingsAccountHref(5)).toBe('/settings/accounts/5');
    expect(getLibraryBookHref(18)).toBe('/library/books/18');
  });
});
