import { usePathname, useRouter } from 'expo-router';
import React from 'react';

type ProfileSheetContextValue = {
  closeProfileSheet: () => void;
  isProfileSheetOpen: boolean;
  openProfileSheet: () => void;
};

const PROFILE_SHEET_ROUTE = '/profile-sheet';

const ProfileSheetContext = React.createContext<ProfileSheetContextValue | null>(null);

export function ProfileSheetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isProfileSheetOpen = pathname === PROFILE_SHEET_ROUTE;

  const openProfileSheet = React.useCallback(() => {
    if (isProfileSheetOpen) {
      return;
    }

    router.push(PROFILE_SHEET_ROUTE);
  }, [isProfileSheetOpen, router]);

  const closeProfileSheet = React.useCallback(() => {
    if (!isProfileSheetOpen) {
      return;
    }

    router.back();
  }, [isProfileSheetOpen, router]);

  const value = React.useMemo(
    () => ({
      closeProfileSheet,
      isProfileSheetOpen,
      openProfileSheet,
    }),
    [closeProfileSheet, isProfileSheetOpen, openProfileSheet]
  );

  return <ProfileSheetContext.Provider value={value}>{children}</ProfileSheetContext.Provider>;
}

export function useProfileSheet() {
  const context = React.useContext(ProfileSheetContext);

  if (!context) {
    throw new Error('useProfileSheet must be used within a ProfileSheetProvider');
  }

  return context;
}
