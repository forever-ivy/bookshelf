import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createExploreUiMessageResponse, createResumeUiMessageResponse } from '../src/server.js';
import { MemoryResumableStreamStore } from '../src/stream-store.js';
import { buildExplorePrompt } from '../src/explore-agent.js';

async function readResponseText(response) {
  if (!response.body) {
    return '';
  }

  let text = '';
  for await (const chunk of response.body) {
    text += Buffer.from(chunk).toString('utf8');
  }
  return text;
}

describe('learning agent server', () => {
  it('stores an error stream when the model api key is missing', async () => {
    const store = new MemoryResumableStreamStore();

    const response = await createExploreUiMessageResponse(
      {
        callbackUrl: '',
        runId: 1,
        streamId: 'learning-ai-run-1',
        userContent: '详细讲解一个文档中的例题',
      },
      {},
      { streamStore: store }
    );

    const responseText = await readResponseText(response);
    const storedChunks = await store.getChunks('learning-ai-run-1', 0);

    assert.match(responseText, /模型请求错误/);
    assert.ok(Array.isArray(storedChunks));
    assert.ok(storedChunks.some((chunk) => chunk.includes('模型请求错误')));
  });

  it('replays a stored stream for resume requests', async () => {
    const store = new MemoryResumableStreamStore();
    await store.initStream('learning-ai-run-1');
    await store.appendChunk(
      'learning-ai-run-1',
      'data: {"type":"text-delta","id":"answer-1","delta":"线程是调度执行单位。"}\n\n'
    );
    await store.appendChunk('learning-ai-run-1', 'data: [DONE]\n\n');
    await store.markCompleted('learning-ai-run-1');

    const response = await createResumeUiMessageResponse(
      'learning-ai-run-1',
      {},
      { streamStore: store }
    );
    const responseText = await readResponseText(response);

    assert.equal(response.status, 200);
    assert.match(responseText, /text-delta/);
    assert.match(responseText, /\[DONE\]/);
  });

  it('waits for the completion callback before finishing the proxied stream', async () => {
    const store = new MemoryResumableStreamStore();

    const response = await createExploreUiMessageResponse(
      {
        callbackUrl: 'http://library-core-api.test/internal/learning/ai-runs/1/complete',
        runId: 1,
        streamId: 'learning-ai-run-1',
        userContent: '详细讲解一个文档中的例题',
      },
      { LIBRARY_LLM_API_KEY: 'test-key' },
      {
        streamStore: store,
        postRunCallback: async () => ({
          turn: {
            assistantContent: '进程是资源分配单位，线程是调度执行单位。',
          },
        }),
        streamText: ({ onFinish }) => {
          setTimeout(() => {
            onFinish({
              reasoningText: '先定位引用。',
              text: '进程是资源分配单位，线程是调度执行单位。',
            });
          }, 10);
          return {
            async *toUIMessageStream() {
              yield {
                delta: '进程是资源分配单位，线程是调度执行单位。',
                id: 'answer-1',
                type: 'text-delta',
              };
            },
          };
        },
      }
    );

    const responseText = await readResponseText(response);

    assert.match(responseText, /text-delta/);
    assert.match(responseText, /data-learning-final/);
    assert.match(responseText, /进程是资源分配单位，线程是调度执行单位/);
    assert.match(responseText, /"type":"finish"/);
  });

  it('passes citation content into the explore prompt format', () => {
    const prompt = buildExplorePrompt({
      citations: [
        {
          chapterLabel: '导数应用',
          snippet: 'Leibniz 公式用于乘积求导。',
        },
      ],
      focusContext: {
        stepTitle: '导数应用',
      },
      relatedConcepts: ['Leibniz公式'],
      userContent: '这部分怎么理解？',
    });

    assert.match(prompt, /导数应用/);
    assert.match(prompt, /Leibniz 公式用于乘积求导/);
  });
});
