import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

import type { LearningPdfAnnotation } from '../../lib/api/types';
import type {
  LearningPdfReaderOutlineItem,
  LearningPdfReaderRuntimeInputMessage,
  LearningPdfReaderRuntimeOutputMessage,
} from '../../lib/learning/pdf-reader-bridge';
import {
  readLearningPdfReaderPageTextContentSafely,
  readLearningPdfReaderBootstrapPayload,
} from '../../lib/learning/pdf-reader-runtime';

type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy['getPage']>>;

type PageRecord = {
  annotationLayer: HTMLDivElement;
  element: HTMLDivElement;
  page: PdfPageProxy;
  pageNumber: number;
  text: string;
  textLayer: HTMLDivElement;
};

const scope = window as Window &
  typeof globalThis & {
    ReactNativeWebView?: { postMessage?: (value: string) => void };
    pdfjsWorker?: { WorkerMessageHandler?: unknown };
  };

const bootstrapPayload = readLearningPdfReaderBootstrapPayload(scope);

let pdfDocument: PdfDocumentProxy | null = null;
let pageRecords: PageRecord[] = [];
let annotations: LearningPdfAnnotation[] = bootstrapPayload?.initialAnnotations ?? [];
let currentPageNumber = Math.max(bootstrapPayload?.initialPageNumber ?? 1, 1);
let currentScale = Math.max(bootstrapPayload?.initialScale ?? 1, 0.5);
let layoutMode = bootstrapPayload?.initialLayoutMode ?? 'horizontal';
let scrollTimer: ReturnType<typeof window.setTimeout> | null = null;
let selectionTimer: ReturnType<typeof window.setTimeout> | null = null;

function postToNative(message: LearningPdfReaderRuntimeOutputMessage) {
  const bridge = scope.ReactNativeWebView;
  if (!bridge?.postMessage) {
    return;
  }

  bridge.postMessage(JSON.stringify(message));
}

function formatRuntimeError(error: unknown) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  return String(error ?? 'unknown error');
}

function postRuntimeError(error: unknown) {
  postToNative({
    message: formatRuntimeError(error),
    type: 'runtimeError',
  });
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function configurePdfWorker() {
  scope.pdfjsWorker = {
    WorkerMessageHandler: pdfjsWorker.WorkerMessageHandler,
  };
}

function buildStyles() {
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }

    .pdf-reader-root {
      background:
        radial-gradient(circle at 12% 8%, rgba(241, 214, 154, 0.32), transparent 26%),
        linear-gradient(145deg, #f7f1e6 0%, #ece8de 46%, #d9e2dd 100%);
      color: #201b16;
      height: 100%;
      overflow: hidden;
      width: 100%;
    }

    .pdf-pages {
      display: flex;
      gap: 18px;
      height: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 24px 18px 28px;
      scroll-behavior: smooth;
      scroll-snap-type: x mandatory;
      width: 100%;
      -webkit-overflow-scrolling: touch;
    }

    .pdf-pages.vertical {
      display: block;
      overflow-x: hidden;
      overflow-y: auto;
      scroll-snap-type: y proximity;
    }

    .pdf-page {
      background: #fffdf8;
      border-radius: 18px;
      box-shadow: 0 18px 56px rgba(38, 31, 24, 0.18);
      flex: 0 0 auto;
      margin: auto 0;
      overflow: hidden;
      position: relative;
      scroll-snap-align: center;
    }

    .pdf-pages.vertical .pdf-page {
      margin: 0 auto 18px;
    }

    .pdf-page canvas {
      display: block;
      height: 100%;
      width: 100%;
    }

    .pdf-text-layer,
    .pdf-annotation-layer {
      inset: 0;
      pointer-events: none;
      position: absolute;
    }

    .pdf-text-layer {
      color: transparent;
      line-height: 1;
      overflow: hidden;
      user-select: text;
      -webkit-user-select: text;
    }

    .pdf-text-layer span {
      cursor: text;
      position: absolute;
      transform-origin: 0% 0%;
      user-select: text;
      white-space: pre;
      -webkit-user-select: text;
    }

    .pdf-annotation-layer {
      z-index: 5;
    }

    .pdf-annotation {
      border-radius: 4px;
      mix-blend-mode: multiply;
      opacity: 0.42;
      position: absolute;
    }

    .pdf-annotation.note {
      border-bottom: 2px solid rgba(28, 84, 112, 0.86);
      opacity: 0.5;
    }

    .pdf-search-hit {
      background: rgba(247, 213, 110, 0.35);
      border-radius: 4px;
      position: absolute;
      z-index: 4;
    }
  `;
  document.head.appendChild(style);
}

function getPagesContainer() {
  return document.querySelector<HTMLDivElement>('.pdf-pages');
}

function setLayoutClass() {
  const container = getPagesContainer();
  if (!container) {
    return;
  }

  container.classList.toggle('vertical', layoutMode !== 'horizontal');
}

function findPageRecordFromElement(element: Element | null) {
  const pageElement = element?.closest?.('.pdf-page') as HTMLDivElement | null;
  if (!pageElement) {
    return null;
  }

  const pageNumber = Number(pageElement.dataset.pageNumber ?? 0);
  return pageRecords.find((record) => record.pageNumber === pageNumber) ?? null;
}

function normalizeRectToPage(rect: DOMRect, pageElement: HTMLElement) {
  const pageRect = pageElement.getBoundingClientRect();
  const left = Math.max(rect.left, pageRect.left);
  const right = Math.min(rect.right, pageRect.right);
  const top = Math.max(rect.top, pageRect.top);
  const bottom = Math.min(rect.bottom, pageRect.bottom);

  if (right <= left || bottom <= top || pageRect.width <= 0 || pageRect.height <= 0) {
    return null;
  }

  return {
    height: clamp01((bottom - top) / pageRect.height),
    width: clamp01((right - left) / pageRect.width),
    x: clamp01((left - pageRect.left) / pageRect.width),
    y: clamp01((top - pageRect.top) / pageRect.height),
  };
}

function renderAnnotationsForPage(record: PageRecord) {
  record.annotationLayer.textContent = '';

  for (const annotation of annotations.filter((item) => item.pageNumber === record.pageNumber)) {
    for (const rect of annotation.anchor.rects) {
      const element = document.createElement('div');
      element.className = `pdf-annotation ${annotation.annotationType === 'note' ? 'note' : ''}`;
      element.dataset.annotationId = String(annotation.id);
      element.style.background = annotation.color ?? '#f7d56e';
      element.style.left = `${rect.x * 100}%`;
      element.style.top = `${rect.y * 100}%`;
      element.style.width = `${rect.width * 100}%`;
      element.style.height = `${rect.height * 100}%`;
      record.annotationLayer.appendChild(element);
    }
  }
}

function renderAnnotations() {
  for (const record of pageRecords) {
    renderAnnotationsForPage(record);
  }
}

async function renderTextLayer(record: PageRecord, viewport: pdfjsLib.PageViewport) {
  const spans: string[] = [];
  const layer = record.textLayer;
  layer.textContent = '';
  const textContent = await readLearningPdfReaderPageTextContentSafely(
    () => record.page.getTextContent(),
    (error) => {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[learning-pdf-reader] getTextContent failed', error);
      }
    }
  );

  if (!textContent) {
    record.text = '';
    return;
  }

  for (const item of textContent.items) {
    if (!('str' in item) || !item.str) {
      continue;
    }

    const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(transform[2], transform[3]);
    const left = transform[4];
    const top = transform[5] - fontHeight;
    const width = Math.max((item.width ?? item.str.length * 6) * currentScale, 1);
    const span = document.createElement('span');
    span.textContent = item.str;
    span.dataset.pageNumber = String(record.pageNumber);
    span.style.fontSize = `${fontHeight}px`;
    span.style.height = `${fontHeight}px`;
    span.style.left = `${left}px`;
    span.style.top = `${top}px`;
    span.style.transform = `scaleX(${width / Math.max(span.textContent.length * fontHeight * 0.48, 1)})`;
    spans.push(item.str);
    layer.appendChild(span);
  }

  record.text = spans.join(' ').replace(/\s+/g, ' ').trim();
}

async function renderPage(pageNumber: number) {
  if (!pdfDocument) {
    return null;
  }

  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: currentScale });
  const outputScale = Math.max(window.devicePixelRatio || 1, 1);
  const element = document.createElement('div');
  element.className = 'pdf-page';
  element.dataset.pageNumber = String(pageNumber);
  element.style.height = `${viewport.height}px`;
  element.style.width = `${viewport.width}px`;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available');
  }
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.height = `${viewport.height}px`;
  canvas.style.width = `${viewport.width}px`;

  const textLayer = document.createElement('div');
  textLayer.className = 'pdf-text-layer';
  const annotationLayer = document.createElement('div');
  annotationLayer.className = 'pdf-annotation-layer';

  element.appendChild(canvas);
  element.appendChild(textLayer);
  element.appendChild(annotationLayer);

  await page.render({
    canvasContext: context,
    transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
    viewport,
  }).promise;

  const record: PageRecord = {
    annotationLayer,
    element,
    page,
    pageNumber,
    text: '',
    textLayer,
  };
  await renderTextLayer(record, viewport);

  return record;
}

async function renderDocument() {
  if (!pdfDocument) {
    return;
  }

  const container = getPagesContainer();
  if (!container) {
    return;
  }

  container.textContent = '';
  pageRecords = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const record = await renderPage(pageNumber);
    if (!record) {
      continue;
    }

    pageRecords.push(record);
    container.appendChild(record.element);
    renderAnnotationsForPage(record);
  }

  window.requestAnimationFrame(() => goToPage(currentPageNumber, false));
}

function postPageChanged(pageNumber: number) {
  if (pageNumber === currentPageNumber) {
    return;
  }

  currentPageNumber = pageNumber;
  postToNative({
    pageNumber,
    scale: currentScale,
    type: 'pageChanged',
  });
}

function syncVisiblePage() {
  const container = getPagesContainer();
  if (!container || pageRecords.length === 0) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const targetCenter =
    layoutMode === 'horizontal'
      ? containerRect.left + containerRect.width / 2
      : containerRect.top + containerRect.height / 2;
  let nearestPageNumber = currentPageNumber;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const record of pageRecords) {
    const rect = record.element.getBoundingClientRect();
    const center =
      layoutMode === 'horizontal' ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
    const distance = Math.abs(center - targetCenter);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPageNumber = record.pageNumber;
    }
  }

  postPageChanged(nearestPageNumber);
}

function goToPage(pageNumber: number, animated = true) {
  const container = getPagesContainer();
  const record = pageRecords.find((item) => item.pageNumber === pageNumber);
  if (!container || !record) {
    return;
  }

  const left = Math.max(record.element.offsetLeft - (container.clientWidth - record.element.clientWidth) / 2, 0);
  const top = Math.max(record.element.offsetTop - 18, 0);
  container.scrollTo({
    behavior: animated ? 'smooth' : 'auto',
    left: layoutMode === 'horizontal' ? left : 0,
    top: layoutMode === 'horizontal' ? 0 : top,
  });
  postPageChanged(pageNumber);
}

async function resolveDestinationPage(destination: unknown) {
  if (!pdfDocument || !destination) {
    return null;
  }

  let dest = destination;
  if (typeof destination === 'string') {
    dest = await pdfDocument.getDestination(destination);
  }

  if (!Array.isArray(dest) || !dest[0]) {
    return null;
  }

  const index = await pdfDocument.getPageIndex(dest[0]);
  return index + 1;
}

async function normalizeOutlineItems(items: any[] | null): Promise<LearningPdfReaderOutlineItem[]> {
  if (!items || !pdfDocument) {
    return [];
  }

  const normalized: LearningPdfReaderOutlineItem[] = [];
  for (const item of items) {
    let pageNumber: number | null = null;
    try {
      pageNumber = await resolveDestinationPage(item.dest);
    } catch {
      pageNumber = null;
    }

    normalized.push({
      dest: typeof item.dest === 'string' ? item.dest : undefined,
      items: await normalizeOutlineItems(Array.isArray(item.items) ? item.items : []),
      pageNumber,
      title: String(item.title ?? '未命名章节'),
    });
  }

  return normalized;
}

function getSelectionContext(pageNumber: number, selectedText: string) {
  const pageText = pageRecords.find((record) => record.pageNumber === pageNumber)?.text ?? '';
  const index = pageText.indexOf(selectedText);
  if (index < 0) {
    return pageText.slice(0, 500);
  }

  return pageText.slice(Math.max(0, index - 240), Math.min(pageText.length, index + selectedText.length + 240));
}

function handleSelectionChanged() {
  if (selectionTimer) {
    window.clearTimeout(selectionTimer);
  }

  selectionTimer = window.setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? '';
    if (!selection || selectedText.length === 0 || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rects = Array.from(range.getClientRects()).filter(
      (rect) => rect.width > 1 && rect.height > 1
    );
    const pageRecord =
      findPageRecordFromElement(range.startContainer.parentElement) ??
      pageRecords.find((record) =>
        rects.some((rect) => {
          const pageRect = record.element.getBoundingClientRect();
          return rect.left < pageRect.right && rect.right > pageRect.left && rect.top < pageRect.bottom && rect.bottom > pageRect.top;
        })
      );

    if (!pageRecord) {
      return;
    }

    const normalizedRects = rects
      .map((rect) => normalizeRectToPage(rect, pageRecord.element))
      .filter((rect): rect is NonNullable<typeof rect> => Boolean(rect));

    if (normalizedRects.length === 0) {
      return;
    }

    postToNative({
      anchor: {
        pageNumber: pageRecord.pageNumber,
        rects: normalizedRects,
        textQuote: selectedText,
      },
      pageNumber: pageRecord.pageNumber,
      selectedText,
      surroundingText: getSelectionContext(pageRecord.pageNumber, selectedText),
      type: 'selectionChanged',
    });
  }, 120);
}

function getNearestTextSpan(pageRecord: PageRecord, point: { x: number; y: number }) {
  let nearestSpan: HTMLSpanElement | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  const pageRect = pageRecord.element.getBoundingClientRect();

  for (const span of Array.from(pageRecord.textLayer.querySelectorAll<HTMLSpanElement>('span'))) {
    const rect = span.getBoundingClientRect();
    const centerX = rect.left - pageRect.left + rect.width / 2;
    const centerY = rect.top - pageRect.top + rect.height / 2;
    const distance = Math.hypot(centerX - point.x, centerY - point.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestSpan = span;
    }
  }

  return nearestSpan;
}

function handlePageTap(event: MouseEvent) {
  const target = event.target as Element | null;
  const pageRecord = findPageRecordFromElement(target);
  if (!pageRecord) {
    return;
  }

  const selectionText = window.getSelection()?.toString().trim() ?? '';
  if (selectionText.length > 0) {
    return;
  }

  const pageRect = pageRecord.element.getBoundingClientRect();
  const xPx = event.clientX - pageRect.left;
  const yPx = event.clientY - pageRect.top;
  const x = clamp01(xPx / pageRect.width);
  const y = clamp01(yPx / pageRect.height);
  const nearestSpan = getNearestTextSpan(pageRecord, { x: xPx, y: yPx });
  const nearbyText = nearestSpan?.textContent?.trim() || pageRecord.text.slice(0, 240);

  postToNative({
    anchor: {
      pageNumber: pageRecord.pageNumber,
      rects: [{ height: 0.02, width: 0.02, x, y }],
      textQuote: nearbyText,
    },
    nearbyText,
    pageNumber: pageRecord.pageNumber,
    type: 'pageTap',
    x,
    y,
  });
}

function runSearch(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    postToNative({
      activeIndex: -1,
      matches: [],
      query,
      total: 0,
      type: 'searchResultChanged',
    });
    return;
  }

  const matches = pageRecords.flatMap((record) => {
    const haystack = record.text.toLowerCase();
    const index = haystack.indexOf(normalizedQuery);
    if (index < 0) {
      return [];
    }

    return [
      {
        pageNumber: record.pageNumber,
        preview: record.text.slice(Math.max(0, index - 40), index + normalizedQuery.length + 80),
      },
    ];
  });

  postToNative({
    activeIndex: matches.length > 0 ? 0 : -1,
    matches,
    query,
    total: matches.length,
    type: 'searchResultChanged',
  });

  if (matches[0]) {
    goToPage(matches[0].pageNumber);
  }
}

function clearSearch() {
  postToNative({
    activeIndex: -1,
    matches: [],
    query: '',
    total: 0,
    type: 'searchResultChanged',
  });
}

async function handleRuntimeMessage(rawData: unknown) {
  if (!rawData || typeof rawData !== 'string') {
    return;
  }

  let message: LearningPdfReaderRuntimeInputMessage | null = null;
  try {
    message = JSON.parse(rawData) as LearningPdfReaderRuntimeInputMessage;
  } catch {
    message = null;
  }

  if (!message) {
    return;
  }

  if (message.type === 'hydrateAnnotations') {
    annotations = message.annotations;
    renderAnnotations();
    return;
  }

  if (message.type === 'goToPage') {
    goToPage(message.pageNumber);
    return;
  }

  if (message.type === 'goToDestination') {
    const pageNumber = await resolveDestinationPage(message.destination);
    if (pageNumber) {
      goToPage(pageNumber);
    }
    return;
  }

  if (message.type === 'setLayoutMode') {
    layoutMode = message.layoutMode;
    setLayoutClass();
    goToPage(currentPageNumber, false);
    return;
  }

  if (message.type === 'runSearch') {
    runSearch(message.query);
    return;
  }

  if (message.type === 'clearSearch') {
    clearSearch();
    return;
  }

  if (message.type === 'applySelectionHighlight') {
    annotations = [...annotations, message.annotation];
    renderAnnotations();
    return;
  }

  if (message.type === 'focusAnnotation') {
    const annotation = annotations.find((item) => item.id === message.annotationId);
    if (annotation) {
      goToPage(annotation.pageNumber);
    }
  }
}

function attachBridgeListeners() {
  const listener = (event: MessageEvent) => {
    void handleRuntimeMessage(event.data).catch(postRuntimeError);
  };
  window.addEventListener('message', listener);
  document.addEventListener('message', listener as EventListener);
}

async function loadDocument() {
  if (!bootstrapPayload) {
    throw new Error('PDF reader bootstrap payload is missing');
  }

  configurePdfWorker();
  const response = await fetch(bootstrapPayload.documentUrl, {
    headers: {
      ...(bootstrapPayload.authorizationHeader
        ? { Authorization: bootstrapPayload.authorizationHeader }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`PDF request failed with ${response.status}`);
  }

  const data = await response.arrayBuffer();
  pdfDocument = await pdfjsLib.getDocument({ data }).promise;
  postToNative({
    pageCount: pdfDocument.numPages,
    title: String((await pdfDocument.getMetadata().catch(() => null))?.info?.Title ?? ''),
    type: 'documentLoaded',
  });
  const outline = await normalizeOutlineItems(await pdfDocument.getOutline().catch(() => null));
  postToNative({
    outline,
    type: 'outlineLoaded',
  });
  await renderDocument();
}

function boot() {
  const root = document.getElementById('root');
  if (!root) {
    return;
  }

  buildStyles();
  root.innerHTML = '<main class="pdf-reader-root"><section class="pdf-pages"></section></main>';
  setLayoutClass();
  attachBridgeListeners();

  const pagesContainer = getPagesContainer();
  pagesContainer?.addEventListener('scroll', () => {
    if (scrollTimer) {
      window.clearTimeout(scrollTimer);
    }
    scrollTimer = window.setTimeout(syncVisiblePage, 100);
  });
  pagesContainer?.addEventListener('click', handlePageTap);
  document.addEventListener('selectionchange', handleSelectionChanged);

  postToNative({ type: 'ready' });
  void loadDocument().catch(postRuntimeError);
}

boot();
