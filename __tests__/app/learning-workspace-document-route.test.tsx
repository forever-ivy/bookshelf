import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import LearningWorkspaceDocumentRoute from '@/app/learning/[profileId]/document';
import { getLearningReaderState } from '@/lib/api/learning';

const mockUseLearningWorkspaceScreen = jest.fn();
const mockUseAppSession = jest.fn();
const mockPdfReader = jest.fn();
const mockSecondaryBackButton = jest.fn();
let mockPdfReaderMode: 'missing' | 'ok' = 'ok';

const readerState = {
  annotations: [
    {
      anchor: {
        pageNumber: 4,
        rects: [{ height: 0.04, width: 0.32, x: 0.18, y: 0.42 }],
        textQuote: '梯度下降',
      },
      annotationType: 'highlight',
      color: '#f2c94c',
      createdAt: '2026-04-21T09:00:00Z',
      id: 55,
      noteText: null,
      pageNumber: 4,
      profileId: 101,
      readerId: 'profile:101:document',
      selectedText: '梯度下降',
      updatedAt: '2026-04-21T09:00:00Z',
    },
  ],
  progress: {
    layoutMode: 'horizontal',
    metadata: {},
    pageNumber: 4,
    profileId: 101,
    readerId: 'profile:101:document',
    scale: 1.25,
    updatedAt: '2026-04-21T09:01:00Z',
  },
  readerId: 'profile:101:document',
};

jest.mock('@/components/learning/learning-pdf-reader-webview', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    LearningPdfReaderWebView: (props: Record<string, unknown>) => {
      mockPdfReader(props);
      React.useEffect(() => {
        if (mockPdfReaderMode === 'missing') {
          const onRuntimeError = props.onRuntimeError;
          if (typeof onRuntimeError === 'function') {
            onRuntimeError('PDF request failed with 404');
          }
        }
      }, [props]);
      return React.createElement(View, { testID: 'learning-workspace-pdfjs-reader' });
    },
  };
});

jest.mock('@/lib/api/learning', () => ({
  createLearningPdfAnnotation: jest.fn(async () => readerState.annotations[0]),
  deleteLearningPdfAnnotation: jest.fn(async () => undefined),
  getLearningReaderState: jest.fn(),
  quickExplainLearningPdfSelection: jest.fn(async () => ({
    answer: '快速解释结果',
    modelName: 'deepseek-chat',
  })),
  updateLearningPdfAnnotation: jest.fn(async () => readerState.annotations[0]),
  updateLearningReaderProgress: jest.fn(async () => readerState.progress),
}));

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

function renderDocumentRoute() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LearningWorkspaceDocumentRoute />
    </QueryClientProvider>
  );
}

describe('LearningWorkspaceDocumentRoute', () => {
  const mockGetLearningReaderState = getLearningReaderState as jest.MockedFunction<
    typeof getLearningReaderState
  >;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'http://127.0.0.1:8000';
    mockPdfReaderMode = 'ok';
    mockPdfReader.mockReset();
    mockSecondaryBackButton.mockReset();
    mockGetLearningReaderState.mockReset();
    mockGetLearningReaderState.mockResolvedValue(readerState as any);
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

  it('renders the authenticated PDF.js reader when the profile has a resolvable pdf source', async () => {
    renderDocumentRoute();

    expect(screen.getByTestId('learning-workspace-document-floating-chrome')).toBeTruthy();
    expect(screen.getByTestId('learning-workspace-document-back-glass')).toBeTruthy();
    expect(mockSecondaryBackButton).toHaveBeenCalledWith(
      expect.objectContaining({
        label: '返回学习区',
        testID: 'learning-workspace-document-back-glass',
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('learning-workspace-pdfjs-reader')).toBeTruthy();
    });
    expect(mockGetLearningReaderState).toHaveBeenCalledWith(101, 'reader-token');
    expect(screen.queryByTestId('learning-workspace-pdf-viewer')).toBeNull();
    expect(mockPdfReader).toHaveBeenCalledWith(
      expect.objectContaining({
        documentUrl: 'http://127.0.0.1:8000/api/v2/learning/profiles/101/document',
        readerState,
        token: 'reader-token',
      })
    );
  });

  it('still opens the reader for book profiles that only expose a bookId-backed synthetic source', async () => {
    mockUseLearningWorkspaceScreen.mockReturnValue({
      closeWorkspace: jest.fn(),
      profile: {
        bookId: 1,
        bookSourceDocumentId: null,
        id: 101,
        sourceType: 'book',
        sources: [
          {
            fileName: 'book-1.md',
            id: 7,
            kind: 'book_synthetic',
            mimeType: 'text/markdown',
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

    renderDocumentRoute();

    await waitFor(() => {
      expect(screen.getByTestId('learning-workspace-pdfjs-reader')).toBeTruthy();
    });
    expect(mockGetLearningReaderState).toHaveBeenCalledWith(101, 'reader-token');
  });

  it('shows a missing-file state when the reader runtime reports a 404 document fetch', async () => {
    mockPdfReaderMode = 'missing';

    renderDocumentRoute();

    await waitFor(() => {
      expect(screen.getByText('资料 PDF 缺失')).toBeTruthy();
    });
    expect(
      screen.getByText('这个导学本记录了 PDF，但后端当前找不到对应文件。请重新生成资料或补齐服务端 artifacts。')
    ).toBeTruthy();
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

    renderDocumentRoute();

    expect(screen.getByText('暂不支持查看资料')).toBeTruthy();
    expect(screen.queryByTestId('learning-workspace-pdfjs-reader')).toBeNull();
    expect(mockGetLearningReaderState).not.toHaveBeenCalled();
  });
});
