import type { LearningGraphHydratePayload } from '@/lib/learning/graph-bridge';

export const LEARNING_GRAPH_BOOTSTRAP_KEY = '__LEARNING_GRAPH_BOOTSTRAP__';

function escapeInlineScript(value: string) {
  return value.replace(/<\/script/gi, '<\\/script');
}

export function buildLearningGraphRuntimeHtml(
  bundle: string,
  hydratePayload: LearningGraphHydratePayload
) {
  const safeBundle = escapeInlineScript(bundle);
  const safeHydratePayload = escapeInlineScript(JSON.stringify(hydratePayload));

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    />
    <style>
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
      }

      canvas {
        display: block;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.${LEARNING_GRAPH_BOOTSTRAP_KEY} = ${safeHydratePayload};
    </script>
    <script>${safeBundle}</script>
  </body>
</html>`;
}

export function readLearningGraphBootstrapPayload(
  scope: Record<string, unknown>
): LearningGraphHydratePayload | null {
  const payload = scope[LEARNING_GRAPH_BOOTSTRAP_KEY];
  delete scope[LEARNING_GRAPH_BOOTSTRAP_KEY];

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload as LearningGraphHydratePayload;
}
