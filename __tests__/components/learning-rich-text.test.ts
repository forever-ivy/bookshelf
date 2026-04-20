import { buildLearningRichTextHtml } from '@/components/learning/learning-rich-text';

describe('learning rich text helpers', () => {
  it('builds local math html without external cdn assets', () => {
    const html = buildLearningRichTextHtml(
      '文档中出现了公式：$$ f(x) = \\frac{x}{1 - x^{2}} $$',
      '#111111'
    );

    expect(html).toContain('<math');
    expect(html).toContain('mfrac');
    expect(html).not.toContain('cdn.jsdelivr');
    expect(html).not.toContain('renderMathInElement');
  });

  it('renders standalone raw latex lines even when the model omits explicit math delimiters', () => {
    const html = buildLearningRichTextHtml(
      '公式的常见形式为：\n(uv)^{(n)} = \\sum_{k=0}^{n} C_n^k u^{(n-k)}v^{(k)}',
      '#111111'
    );

    expect(html).toContain('<math');
    expect(html).toContain('msubsup');
    expect(html).toContain('class="math-display"');
  });

  it('renders inline raw latex tokens inside prose when the model omits dollar delimiters', () => {
    const html = buildLearningRichTextHtml(
      '例如求 f^{100}(x) 或 f^{100}(0) 。',
      '#111111'
    );

    expect(html).toContain('<math');
    expect(html).toContain('class="math-inline"');
  });
});
