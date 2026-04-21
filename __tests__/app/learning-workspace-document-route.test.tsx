import { render, screen } from '@testing-library/react-native';
import React from 'react';

import LearningWorkspaceDocumentRoute from '@/app/learning/[profileId]/document';

const mockUseLearningWorkspaceScreen = jest.fn();
const mockUseAppSession = jest.fn();
const mockPdf = jest.fn();
const mockSecondaryBackButton = jest.fn();

jest.mock('react-native-pdf', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  return function MockPdf(props: Record<string, unknown>) {
    mockPdf(props);
    return React.createElement(View, { testID: 'learning-workspace-pdf-viewer' });
  };
});

jest.mock('@/components/learning/learning-workspace-provider', () => ({
  useLearningWorkspaceScreen: () => mockUseLearningWorkspaceScreen(),
}));

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => mockUseAppSession(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('@/components/navigation/secondary-back-button', () => ({
  SecondaryBackButton: ({
    label,
    testID,
  }: {
    label: string;
    testID?: string;
  }) => {
    const React = jest.requireActual('react') as typeof import('react');
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');

    mockSecondaryBackButton({ label, testID });
    return React.createElement(Text, { testID }, label);
  },
}));

describe('LearningWorkspaceDocumentRoute', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'http://127.0.0.1:8000';
    mockPdf.mockReset();
    mockSecondaryBackButton.mockReset();
    mockUseAppSession.mockReturnValue({ token: 'reader-token' });
    mockUseLearningWorkspaceScreen.mockReturnValue({
      closeWorkspace: jest.fn(),
      profile: {
        bookSourceDocumentId: 41,
        id: 101,
        sourceType: 'book',
        sources: [
          {
            fileName: 'book-1.md',
            id: 7,
            kind: 'book_synthetic',
            mimeType: 'text/markdown',
            originBookSourceDocumentId: 41,
            profileId: 101,
          },
        ],
        title: '机器学习从零到一',
      },
      workspaceGate: {
        description: 'ready',
        kind: 'ready',
        title: '导学本已准备好',
      },
      workspaceSession: {
        id: 88,
      },
    });
  });

  it('renders the authenticated PDF viewer when the profile has a resolvable pdf source', () => {
    render(<LearningWorkspaceDocumentRoute />);

    expect(screen.getByTestId('learning-workspace-document-floating-chrome')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-document-back-glass')).toBeTruthy();
    expect(mockSecondaryBackButton).toHaveBeenCalledWith(
      expect.objectContaining({
        label: '返回学习区',
        testID: 'learning-workspace-document-back-glass',
      })
    );
    expect(screen.getByTestId('learning-workspace-pdf-viewer')).toBeTruthy();
    expect(mockPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          cache: true,
          headers: expect.objectContaining({
            Authorization: 'Bearer reader-token',
          }),
          uri: 'http://127.0.0.1:8000/api/v2/learning/profiles/101/document',
        }),
        style: expect.objectContaining({
          flex: 1,
        }),
      })
    );
  });

  it('shows the unsupported empty state when the profile has no pdf source', () => {
    mockUseLearningWorkspaceScreen.mockReturnValue({
      closeWorkspace: jest.fn(),
      profile: {
        bookSourceDocumentId: null,
        id: 101,
        sourceType: 'upload',
        sources: [
          {
            fileName: 'book-1.md',
            id: 7,
            kind: 'upload_file',
            mimeType: 'text/markdown',
            profileId: 101,
            storagePath: '/srv/learning-storage/book-1.md',
          },
        ],
        title: '机器学习从零到一',
      },
      workspaceGate: {
        description: 'ready',
        kind: 'ready',
        title: '导学本已准备好',
      },
      workspaceSession: {
        id: 88,
      },
    });

    render(<LearningWorkspaceDocumentRoute />);

    expect(screen.getByText('暂不支持查看资料')).toBeTruthy();
    expect(screen.queryByTestId('learning-workspace-pdf-viewer')).toBeNull();
  });
});
