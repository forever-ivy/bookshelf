export const appRoutes = {
  authLogin: '/login',
  authRegister: '/register',
  connect: '/connect',
  home: '/home',
  library: '/library',
  libraryShelf: '/library/shelf',
  reports: '/reports',
  scanner: '/scanner',
  settings: '/settings',
  settingsCabinet: '/settings/cabinet',
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
