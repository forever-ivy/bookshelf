import { createServer } from 'node:http';

import { createDeepSeek } from '@ai-sdk/deepseek';
import { createUIMessageStream, createUIMessageStreamResponse, streamText } from 'ai';

import { buildExplorePrompt, resolveDeepSeekModelName } from './explore-agent.js';
import { createStreamStore } from './stream-store.js';

const DEFAULT_PORT = 8787;
const RESUME_POLL_INTERVAL_MS = 200;

function resolveApiKey(env = process.env) {
  return env.DEEPSEEK_API_KEY || env.LIBRARY_LLM_API_KEY || '';
}

function resolveBaseURL(env = process.env) {
  return env.DEEPSEEK_BASE_URL || env.LIBRARY_LLM_BASE_URL || undefined;
}

function buildUserMessage(body) {
  return (
    body.message || {
      id: typeof body.runId === 'number' ? `user-message-${body.runId}` : undefined,
      role: 'user',
      parts: [{ type: 'text', text: String(body.userContent ?? '') }],
    }
  );
}

function buildAssistantMessage(text, reasoningText) {
  return {
    role: 'assistant',
    parts: [
      ...(reasoningText ? [{ type: 'reasoning', text: reasoningText }] : []),
      { type: 'text', text },
    ],
  };
}

function buildExplorePrelude(body) {
  return [
    {
      type: 'data-user-message',
      data: { message: buildUserMessage(body) },
    },
    {
      type: 'data-status',
      data: { phase: 'retrieving' },
    },
    {
      type: 'data-evidence',
      data: { items: Array.isArray(body.citations) ? body.citations : [] },
    },
    {
      type: 'data-related-concepts',
      data: { items: Array.isArray(body.relatedConcepts) ? body.relatedConcepts : [] },
    },
    {
      type: 'data-followups',
      data: { items: Array.isArray(body.followups) ? body.followups : [] },
    },
    {
      type: 'data-bridge-actions',
      data: { items: Array.isArray(body.bridgeActions) ? body.bridgeActions : [] },
    },
    {
      type: 'data-status',
      data: { phase: 'reasoning' },
    },
  ];
}

function createErrorSseResponse() {
  return new Response(
    ['data: {"type":"error","errorText":"模型请求错误"}', '', 'data: [DONE]', ''].join('\n'),
    {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
      },
      status: 200,
    }
  );
}

function extractErrorText(_error) {
  return '模型请求错误';
}

async function postRunCallback(callbackUrl, payload) {
  if (!callbackUrl) {
    return null;
  }

  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function createStringSseResponse(stream) {
  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
    },
    status: 200,
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function createExploreUiMessageResponse(
  body,
  env = process.env,
  dependencies = {}
) {
  const streamStore = dependencies.streamStore ?? createStreamStore(env);
  const streamId = String(body.streamId ?? `learning-ai-run-${body.runId ?? Date.now()}`);
  const callbackUrl = typeof body.callbackUrl === 'string' ? body.callbackUrl : '';
  const apiKey = resolveApiKey(env);
  await streamStore.initStream(streamId, {
    readerId: body.readerId ?? null,
    runId: body.runId ?? null,
    sessionId: body.sessionId ?? null,
  });

  let finalPayload = null;
  let callbackFailed = false;
  let failureReported = false;

  const reportFailure = async () => {
    if (failureReported) {
      return;
    }
    failureReported = true;
    callbackFailed = true;
    try {
      await postRunCallback(callbackUrl, {
        errorCode: 'learning_model_request_error',
        status: 'failed',
      });
    } catch {}
    await streamStore.markFailed(streamId);
  };

  if (!apiKey) {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        for (const part of buildExplorePrelude(body)) {
          writer.write(part);
        }
        await reportFailure();
        writer.write({ type: 'error', errorText: '模型请求错误' });
      },
      onError: extractErrorText,
    });
    return createUIMessageStreamResponse({
      consumeSseStream: ({ stream: sseStream }) => streamStore.consumeSseStream(streamId, sseStream),
      stream,
    });
  }

  const deepseek = createDeepSeek({
    apiKey,
    ...(resolveBaseURL(env) ? { baseURL: resolveBaseURL(env) } : {}),
  });
  const prompt = buildExplorePrompt({
    citations: body.citations ?? [],
    focusContext: body.focusContext ?? {},
    relatedConcepts: body.relatedConcepts ?? [],
    userContent: String(body.userContent ?? ''),
  });
  const result = streamText({
    model: deepseek(resolveDeepSeekModelName(env)),
    onError: async () => {
      await reportFailure();
    },
    onFinish: async (event) => {
      const answerText = String(event.text ?? '').trim();
      if (!answerText) {
        await reportFailure();
        return;
      }

      try {
        finalPayload = await postRunCallback(callbackUrl, {
          answerText,
          assistantMessage: buildAssistantMessage(answerText, event.reasoningText ?? null),
          reasoningContent: event.reasoningText ?? null,
          status: 'completed',
        });
        await streamStore.markCompleted(streamId);
      } catch {
        callbackFailed = true;
        await streamStore.markFailed(streamId);
      }
    },
    prompt,
    temperature: 0.2,
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      for (const part of buildExplorePrelude(body)) {
        writer.write(part);
      }

      const modelStream = result.toUIMessageStream({
        sendFinish: false,
        sendReasoning: true,
      });
      for await (const part of modelStream) {
        writer.write(part);
      }

      if (finalPayload?.turn) {
        writer.write({ type: 'data-learning-final', data: finalPayload });
        writer.write({ type: 'finish' });
        return;
      }

      if (callbackFailed) {
        writer.write({ type: 'error', errorText: '模型请求错误' });
      }
    },
    onError: extractErrorText,
  });

  return createUIMessageStreamResponse({
    consumeSseStream: ({ stream: sseStream }) => streamStore.consumeSseStream(streamId, sseStream),
    stream,
  });
}

export async function createResumeUiMessageResponse(
  streamId,
  env = process.env,
  dependencies = {}
) {
  const streamStore = dependencies.streamStore ?? createStreamStore(env);
  const state = await streamStore.getState(streamId);
  if (!state) {
    return new Response(null, { status: 204 });
  }

  const stream = new ReadableStream({
    start(controller) {
      let cancelled = false;
      let cursor = 0;

      const pump = async () => {
        while (!cancelled) {
          const chunks = (await streamStore.getChunks(streamId, cursor)) ?? [];
          if (chunks.length > 0) {
            for (const chunk of chunks) {
              controller.enqueue(chunk);
              cursor += 1;
              if (chunk.includes('data: [DONE]')) {
                cancelled = true;
                break;
              }
            }
          }

          if (cancelled) {
            controller.close();
            return;
          }

          const nextState = await streamStore.getState(streamId);
          if (!nextState) {
            controller.close();
            return;
          }

          if (nextState.status !== 'running') {
            const tailChunks = (await streamStore.getChunks(streamId, cursor)) ?? [];
            if (tailChunks.length === 0) {
              controller.close();
              return;
            }
          }

          await delay(RESUME_POLL_INTERVAL_MS);
        }
      };

      pump().catch(() => {
        controller.enqueue('data: {"type":"error","errorText":"模型请求错误"}\n\n');
        controller.enqueue('data: [DONE]\n\n');
        controller.close();
      });
    },
    cancel() {
      return undefined;
    },
  });

  return createStringSseResponse(stream);
}

async function sendWebResponse(nodeResponse, webResponse) {
  nodeResponse.writeHead(
    webResponse.status,
    Object.fromEntries(webResponse.headers.entries())
  );

  if (!webResponse.body) {
    nodeResponse.end();
    return;
  }

  for await (const chunk of webResponse.body) {
    nodeResponse.write(Buffer.from(chunk));
  }
  nodeResponse.end();
}

export function createLearningAgentServer(env = process.env, dependencies = {}) {
  const streamStore = dependencies.streamStore ?? createStreamStore(env);

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
      const isExploreStream =
        request.method === 'POST' &&
        /^\/internal\/ai-sdk\/learning\/explore\/runs\/\d+\/stream$/.test(url.pathname);
      const resumeMatch =
        request.method === 'GET'
          ? url.pathname.match(/^\/internal\/ai-sdk\/streams\/([^/]+)$/)
          : null;

      if (isExploreStream) {
        const body = await readJsonBody(request);
        const webResponse = await createExploreUiMessageResponse(body, env, {
          streamStore,
        });
        await sendWebResponse(response, webResponse);
        return;
      }

      if (resumeMatch) {
        const webResponse = await createResumeUiMessageResponse(resumeMatch[1], env, {
          streamStore,
        });
        await sendWebResponse(response, webResponse);
        return;
      }

      response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'not_found' }));
    } catch {
      await sendWebResponse(response, createErrorSseResponse());
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || process.env.LEARNING_AGENT_PORT || DEFAULT_PORT);
  createLearningAgentServer().listen(port, () => {
    console.log(`learning-agent listening on ${port}`);
  });
}

