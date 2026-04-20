import {
  BottomSheet,
  Group,
  Host as SwiftHost,
  RNHostView as SwiftRNHostView,
} from '@expo/ui/swift-ui';
import {
  interactiveDismissDisabled,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import {
  Host as ComposeHost,
  ModalBottomSheet,
  RNHostView as ComposeRNHostView,
} from '@expo/ui/jetpack-compose';
import React from 'react';
import { Platform, View } from 'react-native';

import { ProfileSheetContent } from '@/components/profile/profile-sheet-content';

type ProfileSheetContextValue = {
  closeProfileSheet: () => void;
  isProfileSheetOpen: boolean;
  openProfileSheet: () => void;
};

const ProfileSheetContext = React.createContext<ProfileSheetContextValue | null>(null);

function NativeProfileSheet({
  isPresented,
  onDismiss,
}: {
  isPresented: boolean;
  onDismiss: () => void;
}) {
  if (Platform.OS === 'ios') {
    return (
      <SwiftHost style={{ position: 'absolute' }} testID="profile-sheet-swift-host">
        <BottomSheet
          isPresented={isPresented}
          onIsPresentedChange={(nextValue) => {
            if (!nextValue) {
              onDismiss();
            }
          }}
          testID="profile-sheet-swift-sheet">
          <Group
            modifiers={[
              presentationDetents(['large']),
              presentationDragIndicator('visible'),
              interactiveDismissDisabled(false),
            ]}>
            {isPresented ? (
              <SwiftRNHostView>
                <ProfileSheetContent onDismiss={onDismiss} scrollMode="react-native" />
              </SwiftRNHostView>
            ) : (
              <View />
            )}
          </Group>
        </BottomSheet>
      </SwiftHost>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View testID="profile-sheet-compose-host">
        <ComposeHost matchContents={{ vertical: true, horizontal: false }} style={{ position: 'absolute' }}>
          {isPresented ? (
            <View testID="profile-sheet-compose-sheet">
              <ModalBottomSheet
                onDismissRequest={onDismiss}
                skipPartiallyExpanded>
                <ComposeRNHostView>
                  <ProfileSheetContent onDismiss={onDismiss} scrollMode="react-native" />
                </ComposeRNHostView>
              </ModalBottomSheet>
            </View>
          ) : null}
        </ComposeHost>
      </View>
    );
  }

  return null;
}

export function ProfileSheetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isProfileSheetOpen, setIsProfileSheetOpen] = React.useState(false);
  const openProfileSheet = React.useCallback(() => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      setIsProfileSheetOpen(true);
    }
  }, []);
  const closeProfileSheet = React.useCallback(() => {
    setIsProfileSheetOpen(false);
  }, []);
  const value = React.useMemo(
    () => ({
      closeProfileSheet,
      isProfileSheetOpen,
      openProfileSheet,
    }),
    [closeProfileSheet, isProfileSheetOpen, openProfileSheet]
  );

  return (
    <ProfileSheetContext.Provider value={value}>
      {children}
      <NativeProfileSheet isPresented={isProfileSheetOpen} onDismiss={closeProfileSheet} />
    </ProfileSheetContext.Provider>
  );
}

export function useProfileSheet() {
  const context = React.useContext(ProfileSheetContext);

  if (!context) {
    throw new Error('useProfileSheet must be used within a ProfileSheetProvider');
  }

  return context;
}
