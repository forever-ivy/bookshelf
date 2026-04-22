import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import LearningWorkspaceDocumentRoute from '@/app/learning/[profileId]/document';

const mockUseLearningWorkspaceScreen = jest.fn();
const mockUseAppSession = jest.fn();
const mockPdf = jest.fn();
const mockPdfSetPage = jest.fn();
const mockSecondaryBackButton = jest.fn();

jest.mock('react-native-pdf', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  return React.forwardRef(function MockPdf(props: Record<string, unknown>, ref) {
    React.useImperativeHandle(ref, () => ({
      setPage: mockPdfSetPage,
    }));
    mockPdf(props);
    return React.createElement(View, { testID: 'learning-workspace-pdf-viewer' });
  });
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
    mockPdfSetPage.mockReset();
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

  it('updates reading status from pdf callbacks', () => {
    render(<LearningWorkspaceDocumentRoute />);

    const pdfProps = mockPdf.mock.calls.at(-1)?.[0] as Record<string, any>;
    act(() => {
      pdfProps.onLoadProgress(0.42);
      pdfProps.onLoadComplete(12, '/cache/course.pdf', { height: 1000, width: 720 });
      pdfProps.onPageChanged(3, 12);
      pdfProps.onScaleChanged(1.5);
    });

    expect(screen.getByText('第 3 / 12 页')).toBeTruthy();
    expect(screen.getByText('缩放 150%')).toBeTruthy();
    expect(screen.getByText('已加载 42%')).toBeTruthy();
  });

  it('jumps pages through the native pdf ref', () => {
    render(<LearningWorkspaceDocumentRoute />);

    const pdfProps = mockPdf.mock.calls.at(-1)?.[0] as Record<string, any>;
    act(() => {
      pdfProps.onLoadComplete(12, '/cache/course.pdf', { height: 1000, width: 720 });
    });

    fireEvent.changeText(screen.getByTestId('learning-workspace-document-page-input'), '5');
    fireEvent.press(screen.getByTestId('learning-workspace-document-jump'));

    expect(mockPdfSetPage).toHaveBeenCalledWith(5);
    expect(screen.getByText('第 5 / 12 页')).toBeTruthy();

    fireEvent.press(screen.getByTestId('learning-workspace-document-next'));
    expect(mockPdfSetPage).toHaveBeenCalledWith(6);
  });

  it('switches reading display and zoom controls through pdf props', () => {
    render(<LearningWorkspaceDocumentRoute />);

    expect(mockPdf.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        enablePaging: false,
        horizontal: false,
        scale: 1,
      })
    );

    fireEvent.press(screen.getByTestId('learning-workspace-document-horizontal-mode'));
    expect(mockPdf.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        enablePaging: true,
        horizontal: true,
      })
    );

    fireEvent.press(screen.getByTestId('learning-workspace-document-zoom-in'));
    expect(mockPdf.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        scale: 1.25,
      })
    );

    fireEvent.press(screen.getByTestId('learning-workspace-document-zoom-reset'));
    expect(mockPdf.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        scale: 1,
      })
    );
  });

  it('uses the pdf error callback to return to the unsupported state', () => {
    render(<LearningWorkspaceDocumentRoute />);

    const pdfProps = mockPdf.mock.calls.at(-1)?.[0] as Record<string, any>;
    act(() => {
      pdfProps.onError(new Error('load failed'));
    });

    expect(screen.getByText('暂不支持查看资料')).toBeTruthy();
    expect(screen.queryByTestId('learning-workspace-pdf-viewer')).toBeNull();
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
