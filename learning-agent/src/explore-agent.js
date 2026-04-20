export function resolveDeepSeekModelName(env = process.env) {
  return env.LIBRARY_LLM_MODEL || env.DEEPSEEK_MODEL || 'deepseek-reasoner';
}

function formatJson(value) {
  return JSON.stringify(value ?? null, null, 2);
}

function formatCitation(citation, index) {
  const title = citation?.sourceTitle || citation?.source_title || citation?.title || `引用 ${index + 1}`;
  const excerpt = citation?.excerpt || citation?.content || '';
  return `【${index + 1}】${title}\n${excerpt}`.trim();
}

export function buildExplorePrompt({
  citations = [],
  focusContext = {},
  relatedConcepts = [],
  userContent,
}) {
  const citationBlock =
    citations.length > 0
      ? citations.map((citation, index) => formatCitation(citation, index)).join('\n\n')
      : '暂无可用引用。若引用不足，请明确说明缺少材料，不要编造。';

  return [
    '你是 grounded notebook 问答助手。请使用中文回答。',
    '必须基于给定引用和焦点上下文作答；不要编造资料外事实。',
    '不要输出 JSON，不要输出 Markdown 代码块，直接给用户可读的讲解。',
    '如果题目要求详细讲解例题，按“题意定位 -> 方法选择 -> 分步推导 -> 易错点”组织。',
    '',
    `用户问题：${userContent}`,
    '',
    `焦点上下文：\n${formatJson(focusContext)}`,
    '',
    `相关概念：\n${formatJson(relatedConcepts)}`,
    '',
    `可用引用：\n${citationBlock}`,
  ].join('\n');
}
