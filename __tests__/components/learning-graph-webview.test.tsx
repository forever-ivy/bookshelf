import { render, screen } from '@testing-library/react-native';
import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import {
  LearningGraphWebView,
  LearningGraphWebViewUnavailable,
  resolveLearningGraphWebViewModule,
} from '@/components/learning/learning-graph-webview';

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => ({
    theme: require('@/constants/app-theme').appTheme,
  }),
}));

describe('learning graph webview availability', () => {
  it('returns null when the native webview module cannot be required', () => {
    const WebViewModule = resolveLearningGraphWebViewModule(() => {
      throw new Error('RNCWebViewModule could not be found');
    });

    expect(WebViewModule).toBeNull();
  });

  it('renders a fallback notice when the webview module is unavailable', () => {
    render(
      <LearningGraphWebViewUnavailable
        body="当前二进制里还没有打进 WebView 原生模块。"
        title="需要重新构建 App"
      />
    );

    expect(screen.getByText('需要重新构建 App')).toBeTruthy();
    expect(screen.getByText('当前二进制里还没有打进 WebView 原生模块。')).toBeTruthy();
  });

  it('embeds the initial hydrate payload into the runtime html before bridge messages arrive', () => {
    render(
      <LearningGraphWebView
        hydratePayload={{
          config: {
            conceptLabelZoom: 1.8,
            cooldownTicks: 120,
            linkDistances: {
              DERIVED_FROM: 88,
            },
            nodeSizes: {
              Book: 14,
              Concept: 6,
            },
            velocityDecay: 0.25,
          },
          edgeKeysByNodeId: {
            'concept:limits': ['fragment:1::concept:limits::MENTIONS'],
          },
          generatedNodeIds: ['explore:concept:无穷小'],
          graph: {
            edges: [{ source: 'fragment:1', target: 'concept:limits', type: 'MENTIONS' }],
            nodes: [
              { id: 'book:1', label: '高数', type: 'Book' },
              {
                id: 'concept:limits',
                label: '极限',
                type: 'Concept',
              },
              {
                chapterLabel: '第一章',
                chunkIndex: 0,
                id: 'fragment:1',
                label: '函数极限的定义',
                semanticSummary: '函数极限的定义',
                type: 'Fragment',
              },
            ],
            provider: 'fallback',
          },
          guideStatusByNodeId: {
            'concept:limits': 'completed',
          },
          highlightedNodeIds: ['concept:limits', 'fragment:1'],
          linkedNodeIdsByNodeId: {
            'book:1': [],
            'concept:limits': ['fragment:1'],
            'fragment:1': ['concept:limits'],
          },
          mode: 'global',
          selectedNodeId: null,
          theme: {
            background: '#ffffff',
            borderSoft: '#dddddd',
            edge: '#999999',
            explore: '#ff9900',
            fragment: '#aaaaaa',
            primary: '#333333',
            source: '#009900',
            step: '#cc9900',
            success: '#006600',
            surface: '#ffffff',
            text: '#111111',
            textSoft: '#666666',
            warning: '#cc9900',
          },
        }}
        hydrateToken={0}
        onBackgroundTap={() => undefined}
        onNodeTap={() => undefined}
        selectedNodeId="concept:limits"
      />
    );

    const webView = screen.getByTestId('learning-graph-webview');
    const runtimeHtml = webView.props.source?.html;

    expect(runtimeHtml).toContain('__LEARNING_GRAPH_BOOTSTRAP__');
    expect(runtimeHtml).toContain('"selectedNodeId":"concept:limits"');
    expect(runtimeHtml).toContain('函数极限的定义');
  });

  it('handles runtime status and webview failures without logging to the RN console', () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <LearningGraphWebView
        hydratePayload={{
          config: {
            conceptLabelZoom: 1.8,
            cooldownTicks: 120,
            linkDistances: {
              DERIVED_FROM: 88,
            },
            nodeSizes: {
              Book: 14,
              Concept: 6,
            },
            velocityDecay: 0.25,
          },
          edgeKeysByNodeId: {},
          generatedNodeIds: [],
          graph: {
            edges: [],
            nodes: [{ id: 'book:1', label: '高数', type: 'Book' }],
            provider: 'fallback',
          },
          guideStatusByNodeId: {},
          highlightedNodeIds: [],
          linkedNodeIdsByNodeId: {
            'book:1': [],
          },
          mode: 'global',
          selectedNodeId: null,
          theme: {
            background: '#ffffff',
            borderSoft: '#dddddd',
            edge: '#999999',
            explore: '#ff9900',
            fragment: '#aaaaaa',
            primary: '#333333',
            source: '#009900',
            step: '#cc9900',
            success: '#006600',
            surface: '#ffffff',
            text: '#111111',
            textSoft: '#666666',
            warning: '#cc9900',
          },
        }}
        hydrateToken={0}
        onBackgroundTap={() => undefined}
        onNodeTap={() => undefined}
        selectedNodeId={null}
      />
    );

    const webView = screen.getByTestId('learning-graph-webview');

    fireEvent(webView, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          detail: 'nodes=1',
          phase: 'hydrate',
          type: 'status',
        }),
      },
    });

    fireEvent(webView, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          message: 'TypeError: graph.d3Force is not a function',
          type: 'runtimeError',
        }),
      },
    });

    fireEvent(webView, 'error', {
      nativeEvent: {
        description: 'load failed',
      },
    });

    fireEvent(webView, 'contentProcessDidTerminate');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    debugSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
