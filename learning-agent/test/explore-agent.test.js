import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildExplorePrompt, resolveDeepSeekModelName } from '../src/explore-agent.js';

describe('explore agent prompt', () => {
  it('builds a grounded non-json answer prompt with user content and citations', () => {
    const prompt = buildExplorePrompt({
      citations: [
        {
          excerpt: 'Leibniz 公式适用于乘积函数的高阶导数。',
          sourceTitle: '微积分A(1)',
        },
      ],
      focusContext: {
        stepTitle: '导数应用',
      },
      relatedConcepts: ['Leibniz公式'],
      userContent: '详细讲解文档里的第二题',
    });

    assert.match(prompt, /详细讲解文档里的第二题/);
    assert.match(prompt, /微积分A\(1\)/);
    assert.match(prompt, /Leibniz 公式适用于乘积函数的高阶导数/);
    assert.match(prompt, /不要输出 JSON/);
  });

  it('uses normalized citation fields when source fields are absent', () => {
    const prompt = buildExplorePrompt({
      citations: [
        {
          title: '计算机组成原理',
          excerpt: '总线负责连接 CPU、存储器和 I/O 设备。',
        },
      ],
      focusContext: {},
      relatedConcepts: [],
      userContent: '总线有什么作用？',
    });

    assert.match(prompt, /计算机组成原理/);
    assert.match(prompt, /总线负责连接 CPU、存储器和 I\/O 设备/);
  });

  it('defaults to deepseek-reasoner unless an explicit model is configured', () => {
    assert.equal(resolveDeepSeekModelName({}), 'deepseek-reasoner');
    assert.equal(resolveDeepSeekModelName({ LIBRARY_LLM_MODEL: 'deepseek-chat' }), 'deepseek-chat');
  });
});
