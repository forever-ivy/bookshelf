import type {
  LearningPdfAnchor,
  LearningPdfAnnotation,
  LearningReaderLayoutMode,
} from '@/lib/api/types';

export type LearningPdfReaderRuntimeBootstrapPayload = {
  authorizationHeader: string | null;
  documentUrl: string;
  initialAnnotations: LearningPdfAnnotation[];
  initialLayoutMode: LearningReaderLayoutMode;
  initialPageNumber: number;
  initialScale: number;
  readerId: string;
};

export type LearningPdfReaderOutlineItem = {
  dest?: unknown;
  items?: LearningPdfReaderOutlineItem[];
  pageNumber?: number | null;
  title: string;
};

export type LearningPdfReaderSelectionPayload = {
  anchor: LearningPdfAnchor;
  pageNumber: number;
  selectedText: string;
  surroundingText?: string | null;
};

export type LearningPdfReaderPageTapPayload = {
  anchor: LearningPdfAnchor;
  nearbyText?: string | null;
  pageNumber: number;
  x: number;
  y: number;
};

export type LearningPdfReaderSearchMatch = {
  pageNumber: number;
  preview: string;
};

export type LearningPdfReaderSearchResultPayload = {
  activeIndex: number;
  matches: LearningPdfReaderSearchMatch[];
  query: string;
  total: number;
};

export type LearningPdfReaderRuntimeInputMessage =
  | {
      annotations: LearningPdfAnnotation[];
      type: 'hydrateAnnotations';
    }
  | {
      pageNumber: number;
      type: 'goToPage';
    }
  | {
      destination: unknown;
      type: 'goToDestination';
    }
  | {
      layoutMode: LearningReaderLayoutMode;
      type: 'setLayoutMode';
    }
  | {
      query: string;
      type: 'runSearch';
    }
  | {
      type: 'clearSearch';
    }
  | {
      annotation: LearningPdfAnnotation;
      type: 'applySelectionHighlight';
    }
  | {
      annotationId: number;
      type: 'focusAnnotation';
    };

export type LearningPdfReaderRuntimeOutputMessage =
  | {
      type: 'ready';
    }
  | {
      pageCount: number;
      title?: string | null;
      type: 'documentLoaded';
    }
  | {
      outline: LearningPdfReaderOutlineItem[];
      type: 'outlineLoaded';
    }
  | {
      pageNumber: number;
      scale: number;
      type: 'pageChanged';
    }
  | (LearningPdfReaderSelectionPayload & {
      type: 'selectionChanged';
    })
  | (LearningPdfReaderPageTapPayload & {
      type: 'pageTap';
    })
  | (LearningPdfReaderSearchResultPayload & {
      type: 'searchResultChanged';
    })
  | {
      message: string;
      type: 'runtimeError';
    };
