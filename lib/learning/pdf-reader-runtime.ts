import type { LearningPdfReaderRuntimeBootstrapPayload } from '@/lib/learning/pdf-reader-bridge';

export const LEARNING_PDF_READER_BOOTSTRAP_KEY = '__LEARNING_PDF_READER_BOOTSTRAP__';
export const LEARNING_PDF_READER_RUNTIME_LOADER_CHANNEL =
  '__LEARNING_PDF_READER_RUNTIME_LOADER__';

function escapeInlineScript(value: string) {
  return value.replace(/<\/script/gi, '<\\/script');
}

function stringifyForJavaScriptExpression(value: unknown) {
  return JSON.stringify(JSON.stringify(value));
}

export function buildLearningPdfReaderRuntimeHtml() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body></body></html>';
}

export async function readLearningPdfReaderPageTextContentSafely<T>(
  loadTextContent: () => Promise<T>,
  onError?: (error: unknown) => void
) {
  try {
    return await loadTextContent();
  } catch (error) {
    onError?.(error);
    return null;
  }
}

export function buildLearningPdfReaderLoaderScript(
  bootstrapPayload: LearningPdfReaderRuntimeBootstrapPayload
) {
  const bootstrapExpression = stringifyForJavaScriptExpression(bootstrapPayload);
  const loaderChannelExpression = stringifyForJavaScriptExpression(
    LEARNING_PDF_READER_RUNTIME_LOADER_CHANNEL
  );
  const styleTextExpression = stringifyForJavaScriptExpression(`
    html, body, #root {
      background: #f5f4f1;
      height: 100%;
      margin: 0;
      overflow: hidden;
      padding: 0;
      width: 100%;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      -webkit-user-select: text;
      user-select: text;
    }
  `);

  return escapeInlineScript(`(function () {
    const bootstrapPayload = JSON.parse(${bootstrapExpression});
    const loaderChannel = JSON.parse(${loaderChannelExpression});
    const styleText = JSON.parse(${styleTextExpression});

    window.${LEARNING_PDF_READER_BOOTSTRAP_KEY} = bootstrapPayload;

    const doc = window.document;
    const html = doc.documentElement || doc.appendChild(doc.createElement('html'));
    html.lang = 'zh-CN';

    let head = doc.head;
    if (!head) {
      head = doc.createElement('head');
      html.appendChild(head);
    }

    let viewport = head.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = doc.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      head.appendChild(viewport);
    }
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=3, user-scalable=yes, viewport-fit=cover'
    );

    let style = head.querySelector('style[data-learning-pdf-reader]');
    if (!style) {
      style = doc.createElement('style');
      style.setAttribute('data-learning-pdf-reader', 'true');
      head.appendChild(style);
    }
    style.textContent = styleText;

    let body = doc.body;
    if (!body) {
      body = doc.createElement('body');
      html.appendChild(body);
    }
    body.innerHTML = '<div id="root"></div>';

    const runtimeChunks = [];
    let runtimeExecuted = false;

    function postToNative(message) {
      const bridge = window.ReactNativeWebView;
      if (!bridge || typeof bridge.postMessage !== 'function') {
        return;
      }

      bridge.postMessage(JSON.stringify(message));
    }

    function postRuntimeError(error) {
      const message =
        error instanceof Error ? error.stack || error.message : String(error ?? 'unknown error');
      postToNative({ message, type: 'runtimeError' });
    }

    function executeRuntime() {
      if (runtimeExecuted) {
        return;
      }

      runtimeExecuted = true;
      try {
        const runtimeSource = runtimeChunks.join('');
        runtimeChunks.length = 0;
        (0, eval)(runtimeSource);
      } catch (error) {
        postRuntimeError(error);
      }
    }

    function handleRuntimeMessage(event) {
      if (!event || typeof event.data !== 'string') {
        return;
      }

      let payload = null;
      try {
        payload = JSON.parse(event.data);
      } catch {
        payload = null;
      }

      if (!payload || payload.channel !== loaderChannel) {
        return;
      }

      if (payload.type === 'runtimeChunk') {
        runtimeChunks[payload.index] = String(payload.chunk ?? '');
        return;
      }

      if (payload.type === 'runtimeExecute') {
        executeRuntime();
      }
    }

    window.addEventListener('message', handleRuntimeMessage);
    document.addEventListener('message', handleRuntimeMessage);
    postToNative({ type: 'loaderReady' });
  })(); true;`);
}

export function chunkLearningPdfReaderRuntimeBundle(bundle: string, maxChunkSize = 60000) {
  if (maxChunkSize <= 0 || bundle.length <= maxChunkSize) {
    return [bundle];
  }

  const chunks: string[] = [];
  for (let index = 0; index < bundle.length; index += maxChunkSize) {
    chunks.push(bundle.slice(index, index + maxChunkSize));
  }

  return chunks;
}

export function readLearningPdfReaderBootstrapPayload(
  scope: Record<string, unknown>
): LearningPdfReaderRuntimeBootstrapPayload | null {
  const payload = scope[LEARNING_PDF_READER_BOOTSTRAP_KEY];
  delete scope[LEARNING_PDF_READER_BOOTSTRAP_KEY];

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload as LearningPdfReaderRuntimeBootstrapPayload;
}
