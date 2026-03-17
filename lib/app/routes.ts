export const appRoutes = {
  authLogin: '/login',
  authRegister: '/register',
  connect: '/connect',
  home: '/home',
  library: '/library',
  libraryBooks: '/library/books',
  libraryBooksNew: '/library/books/new',
  libraryShelf: '/library/shelf',
  reports: '/reports',
  reportsReadingEvents: '/reports/reading-events',
  scanner: '/scanner',
  settings: '/settings',
  settingsAccounts: '/settings/accounts',
  settingsCabinet: '/settings/cabinet',
  settingsFamily: '/settings/family',
  settingsMembers: '/settings/members',
  settingsMembersForm: '/settings/members/form',
  libraryBooklist: '/library/booklist',
  libraryStoreBook: '/library/store-book',
  libraryTakeBook: '/library/take-book',
} as const;

export function getMemberProfileHref(memberId: number | string) {
  return `${appRoutes.home}/profile/${memberId}` as const;
}

export function getMemberGoalsHref(memberId: number | string) {
  return `${getMemberProfileHref(memberId)}/goals` as const;
}

export function getSettingsAccountHref(accountId: number | string) {
  return `${appRoutes.settingsAccounts}/${accountId}` as const;
}

export function getLibraryBookHref(bookId: number | string) {
  return `${appRoutes.libraryBooks}/${bookId}` as const;
}
