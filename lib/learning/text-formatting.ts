const COMPLETE_MATH_PATTERN =
  /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$[^$\n]+(?<!\\)\$/g;
const LATEX_TEXT_COMMAND_PATTERN = /\\(?:text|mathrm|operatorname)\s*\{([^{}]*)\}/g;
const LATEX_COMMAND_PATTERN =
  /\\(?:frac|sum|prod|lim|int|sqrt|left|right|cdot|times|sin|cos|tan|ln|log|alpha|beta|gamma|theta|lambda|mu|pi|sigma|phi|omega|rightarrow|to|infty|leq|geq|neq|approx|partial|nabla|binom|mathrm|text|operatorname)\b/g;
const LATEX_WORD_TOKEN_PATTERN =
  /(^|\s)(?:frac|lim|infty|rightarrow|left|right|cdot|times|sqrt)(?=\s|$)/g;
const MARKDOWN_DECORATION_PATTERN = /[*_`~]/g;

function countPattern(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function countUnescapedDoubleDollarDelimiters(value: string) {
  return countPattern(value, /(?<!\\)\$\$/g);
}

function countUnescapedSingleDollarDelimiters(value: string) {
  return countPattern(value.replace(/(?<!\\)\$\$/g, ''), /(?<!\\)\$/g);
}

function hasUnbalancedBraces(value: string) {
  let depth = 0;

  for (const character of value) {
    if (character === '{') {
      depth += 1;
    }
    if (character === '}') {
      depth -= 1;
    }
    if (depth < 0) {
      return true;
    }
  }

  return depth !== 0;
}

function hasMathSyntax(value: string) {
  return /(?<!\\)\$|\\[A-Za-z]+|\\\(|\\\)|\\\[|\\\]|[A-Za-z0-9)\]}][_^]\{/.test(value);
}

export function learningTextHasMalformedMath(value: unknown) {
  const normalized = String(value ?? '');

  if (!normalized.trim()) {
    return false;
  }

  const openInlineCount = countPattern(normalized, /\\\(/g);
  const closeInlineCount = countPattern(normalized, /\\\)/g);
  const openBlockCount = countPattern(normalized, /\\\[/g);
  const closeBlockCount = countPattern(normalized, /\\\]/g);

  return (
    countUnescapedDoubleDollarDelimiters(normalized) % 2 !== 0 ||
    countUnescapedSingleDollarDelimiters(normalized) % 2 !== 0 ||
    openInlineCount !== closeInlineCount ||
    openBlockCount !== closeBlockCount ||
    (hasMathSyntax(normalized) && hasUnbalancedBraces(normalized))
  );
}

export function sanitizeLearningPlainText(value: unknown) {
  return String(value ?? '')
    .replace(/^\s*#+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeLearningRichTextForDisplay(value: unknown) {
  const normalized = String(value ?? '').replace(/\r\n?/g, '\n').trim();

  if (!normalized) {
    return '';
  }

  if (!learningTextHasMalformedMath(normalized)) {
    return normalized;
  }

  return sanitizeMalformedLearningText(normalized);
}

export function sanitizeMalformedLearningText(value: unknown) {
  const normalized = sanitizeLearningPlainText(value);

  if (!normalized) {
    return '';
  }

  const sanitized = normalized
    .replace(COMPLETE_MATH_PATTERN, ' 公式 ')
    .replace(LATEX_TEXT_COMMAND_PATTERN, ' $1 ')
    .replace(/\\\(|\\\)|\\\[|\\\]/g, ' ')
    .replace(/(?<!\\)\$\$/g, ' ')
    .replace(/(?<!\\)\$/g, ' ')
    .replace(LATEX_COMMAND_PATTERN, ' ')
    .replace(/\\[A-Za-z]*/g, ' ')
    .replace(/\\/g, ' ')
    .replace(MARKDOWN_DECORATION_PATTERN, ' ')
    .replace(/[{}^]/g, ' ')
    .replace(LATEX_WORD_TOKEN_PATTERN, '$1')
    .replace(/\s+([,，。！？；;:：])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized || '公式片段暂不可预览';
}

export function sanitizeLearningTextForDisplay(value: unknown) {
  const normalized = sanitizeLearningPlainText(value);

  if (!learningTextHasMalformedMath(normalized)) {
    return normalized;
  }

  return sanitizeMalformedLearningText(normalized);
}
