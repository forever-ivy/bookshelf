import {
  LEARNING_PDF_READER_BOOTSTRAP_KEY,
  LEARNING_PDF_READER_RUNTIME_LOADER_CHANNEL,
  buildLearningPdfReaderLoaderScript,
  buildLearningPdfReaderRuntimeHtml,
  chunkLearningPdfReaderRuntimeBundle,
  readLearningPdfReaderPageTextContentSafely,
  readLearningPdfReaderBootstrapPayload,
} from '@/lib/learning/pdf-reader-runtime';

describe('learning pdf reader runtime html', () => {
  it('builds a minimal blank runtime shell html', () => {
    const html = buildLearningPdfReaderRuntimeHtml();

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).not.toContain(LEARNING_PDF_READER_BOOTSTRAP_KEY);
    expect(html).not.toContain(LEARNING_PDF_READER_RUNTIME_LOADER_CHANNEL);
  });

  it('reads and clears the bootstrap payload from a runtime scope', () => {
    const scope = {
      [LEARNING_PDF_READER_BOOTSTRAP_KEY]: {
        authorizationHeader: null,
        documentUrl: 'https://library.example/api/v2/learning/profiles/101/document',
        initialAnnotations: [],
        initialLayoutMode: 'horizontal',
        initialPageNumber: 1,
        initialScale: 1,
        readerId: 'profile:101:document',
      },
    };

    expect(readLearningPdfReaderBootstrapPayload(scope)).toMatchObject({
      documentUrl: 'https://library.example/api/v2/learning/profiles/101/document',
      initialLayoutMode: 'horizontal',
    });
    expect(scope).not.toHaveProperty(LEARNING_PDF_READER_BOOTSTRAP_KEY);
  });

  it('builds a loader script that installs bootstrap and runtime chunk listeners', () => {
    const script = buildLearningPdfReaderLoaderScript({
      authorizationHeader: 'Bearer reader-token',
      documentUrl: 'https://library.example/api/v2/learning/profiles/101/document',
      initialAnnotations: [],
      initialLayoutMode: 'horizontal',
      initialPageNumber: 4,
      initialScale: 1.25,
      readerId: 'profile:101:document',
    });

    expect(script).toContain(LEARNING_PDF_READER_BOOTSTRAP_KEY);
    expect(script).toContain(LEARNING_PDF_READER_RUNTIME_LOADER_CHANNEL);
    expect(script).toContain('/api/v2/learning/profiles/101/document');
    expect(script).toContain('loaderReady');
    expect(script.endsWith('true;')).toBe(true);
  });

  it('splits the runtime bundle into deterministic chunks', () => {
    expect(chunkLearningPdfReaderRuntimeBundle('abcdef', 2)).toEqual(['ab', 'cd', 'ef']);
    expect(chunkLearningPdfReaderRuntimeBundle('abcdef', 20)).toEqual(['abcdef']);
  });

  it('treats page text extraction failures as non-fatal', async () => {
    const onError = jest.fn();

    await expect(
      readLearningPdfReaderPageTextContentSafely(
        async () => {
          throw new Error('getTextContent failed');
        },
        onError
      )
    ).resolves.toBeNull();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0]?.[0] as Error).message).toBe('getTextContent failed');
  });
});
