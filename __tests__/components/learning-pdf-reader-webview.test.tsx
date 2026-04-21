import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  LearningPdfReaderWebView,
  LearningPdfReaderWebViewUnavailable,
  resolveLearningPdfReaderWebViewModule,
} from '@/components/learning/learning-pdf-reader-webview';
import { buildLearningPdfReaderRuntimeHtml } from '@/lib/learning/pdf-reader-runtime';

const readerState = {
  annotations: [
    {
      anchor: {
        pageNumber: 4,
        rects: [{ height: 0.04, width: 0.32, x: 0.18, y: 0.42 }],
        textQuote: '梯度下降',
      },
      annotationType: 'highlight' as const,
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
    layoutMode: 'horizontal' as const,
    metadata: {},
    pageNumber: 4,
    profileId: 101,
    readerId: 'profile:101:document',
    scale: 1.25,
    updatedAt: '2026-04-21T09:01:00Z',
  },
  readerId: 'profile:101:document',
};

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => ({
    theme: require('@/constants/app-theme').appTheme,
  }),
}));

describe('learning pdf reader webview', () => {
  it('returns null when the native webview module cannot be required', () => {
    const WebViewModule = resolveLearningPdfReaderWebViewModule(() => {
      throw new Error('RNCWebViewModule could not be found');
    });

    expect(WebViewModule).toBeNull();
  });

  it('renders a fallback notice when the webview module is unavailable', () => {
    render(
      <LearningPdfReaderWebViewUnavailable
        body="当前开发包还没有包含 WebView 原生模块。"
        title="需要重新构建 App"
      />
    );

    expect(screen.getByText('需要重新构建 App')).toBeTruthy();
    expect(screen.getByText('当前开发包还没有包含 WebView 原生模块。')).toBeTruthy();
  });

  it('loads an inline html shell first and defers runtime installation until after load end', () => {
    render(
      <LearningPdfReaderWebView
        command={null}
        documentUrl="https://library.example/api/v2/learning/profiles/101/document"
        onDocumentLoadFailed={() => undefined}
        onDocumentLoaded={() => undefined}
        onOutlineLoaded={() => undefined}
        onPageChanged={() => undefined}
        onPageTap={() => undefined}
        onRuntimeError={() => undefined}
        onSearchResultChanged={() => undefined}
        onSelectionChanged={() => undefined}
        readerState={readerState}
        token="reader-token"
      />
    );

    const webView = screen.getByTestId('learning-pdf-reader-webview');

    expect(webView.props.source).toEqual({
      baseUrl: 'https://library.example/api/v2/learning/profiles/101/document',
      html: buildLearningPdfReaderRuntimeHtml(),
    });
    expect(typeof webView.props.onLoadEnd).toBe('function');
    expect(webView.props.injectedJavaScript).toBeUndefined();
    expect(webView.props.injectedJavaScriptBeforeContentLoaded).toBeUndefined();
  });

  it('bridges outline, page, selection, tap, search, and runtime error messages to native callbacks', () => {
    const onDocumentLoaded = jest.fn();
    const onOutlineLoaded = jest.fn();
    const onPageChanged = jest.fn();
    const onSelectionChanged = jest.fn();
    const onPageTap = jest.fn();
    const onSearchResultChanged = jest.fn();
    const onRuntimeError = jest.fn();

    render(
      <LearningPdfReaderWebView
        command={null}
        documentUrl="https://library.example/api/v2/learning/profiles/101/document"
        onDocumentLoadFailed={() => undefined}
        onDocumentLoaded={onDocumentLoaded}
        onOutlineLoaded={onOutlineLoaded}
        onPageChanged={onPageChanged}
        onPageTap={onPageTap}
        onRuntimeError={onRuntimeError}
        onSearchResultChanged={onSearchResultChanged}
        onSelectionChanged={onSelectionChanged}
        readerState={readerState}
        token="reader-token"
      />
    );

    const webView = screen.getByTestId('learning-pdf-reader-webview');

    fireEvent(webView, 'message', {
      nativeEvent: {
        data: JSON.stringify({ pageCount: 12, title: '线性代数讲义', type: 'documentLoaded' }),
      },
    });
    fireEvent(webView, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          outline: [{ dest: 'dest-1', pageNumber: 2, title: '第一章' }],
          type: 'outlineLoaded',
        }),
      },
    });
    fireEvent(webView, 'message', {
      nativeEvent: {
        data: JSON.stringify({ pageNumber: 5, scale: 1.5, type: 'pageChanged' }),
      },
    });
    fireEvent(webView, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          anchor: {
            pageNumber: 5,
            rects: [{ height: 0.05, width: 0.4, x: 0.1, y: 0.2 }],
            textQuote: '反向传播',
          },
          pageNumber: 5,
          selectedText: '反向传播',
          surroundingText: '神经网络通过反向传播更新参数。',
          type: 'selectionChanged',
        }),
      },
    });
    fireEvent(webView, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          anchor: {
            pageNumber: 5,
            rects: [{ height: 0.02, width: 0.02, x: 0.2, y: 0.3 }],
            textQuote: '损失函数',
          },
          nearbyText: '损失函数衡量预测误差。',
          pageNumber: 5,
          type: 'pageTap',
          x: 0.2,
          y: 0.3,
        }),
      },
    });
    fireEvent(webView, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          activeIndex: 0,
          matches: [{ pageNumber: 5, preview: '反向传播更新参数' }],
          query: '反向传播',
          total: 1,
          type: 'searchResultChanged',
        }),
      },
    });
    fireEvent(webView, 'message', {
      nativeEvent: {
        data: JSON.stringify({ message: 'PDF load failed', type: 'runtimeError' }),
      },
    });

    expect(onDocumentLoaded).toHaveBeenCalledWith({ pageCount: 12, title: '线性代数讲义' });
    expect(onOutlineLoaded).toHaveBeenCalledWith([
      { dest: 'dest-1', pageNumber: 2, title: '第一章' },
    ]);
    expect(onPageChanged).toHaveBeenCalledWith({ pageNumber: 5, scale: 1.5 });
    expect(onSelectionChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        pageNumber: 5,
        selectedText: '反向传播',
      })
    );
    expect(onPageTap).toHaveBeenCalledWith(
      expect.objectContaining({
        nearbyText: '损失函数衡量预测误差。',
        pageNumber: 5,
      })
    );
    expect(onSearchResultChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '反向传播',
        total: 1,
      })
    );
    expect(onRuntimeError).toHaveBeenCalledWith('PDF load failed');
  });
});
