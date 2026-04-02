jest.mock('@/lib/api/client', () => ({
  LibraryApiError: class LibraryApiError extends Error {
    code: string;
    details?: unknown;
    status: number | null;

    constructor(message: string, options: { code: string; details?: unknown; status?: number | null }) {
      super(message);
      this.name = 'LibraryApiError';
      this.code = options.code;
      this.details = options.details;
      this.status = options.status ?? null;
    }
  },
  libraryRequest: jest.fn(),
}));

jest.mock('@/lib/api/mock', () => ({
  createMockBooklist: jest.fn(() => ({
    books: [],
    description: 'mock',
    id: 'mock-booklist',
    source: 'custom',
    title: 'mock',
  })),
  listMockBooklists: jest.fn(() => [
    {
      books: [],
      description: 'mock',
      id: 'mock-booklist',
      source: 'system',
      title: 'mock',
    },
  ]),
}));

import { libraryRequest } from '@/lib/api/client';
import { createMockBooklist, listMockBooklists } from '@/lib/api/mock';
import { createBooklist, listBooklists } from '@/lib/api/booklists';

describe('booklists contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid booklists payloads instead of silently falling back to mock data', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      reader_seed: 'reader_038_rich_seed_20260401',
    });

    await expect(listBooklists('reader-token')).rejects.toMatchObject({
      code: 'booklists_invalid_payload',
      name: 'LibraryApiError',
      status: 500,
    });

    expect(listMockBooklists).not.toHaveBeenCalled();
  });

  it('keeps create-booklist on the real API path instead of returning a mock list', async () => {
    (libraryRequest as jest.Mock).mockRejectedValue({
      code: 'http_503',
      name: 'LibraryApiError',
      status: 503,
    });

    await expect(
      createBooklist(
        {
          bookIds: [1, 2],
          description: '把这两本放进一份书单',
          title: '课程导读',
        },
        'reader-token'
      )
    ).rejects.toMatchObject({
      code: 'http_503',
      name: 'LibraryApiError',
      status: 503,
    });

    expect(createMockBooklist).not.toHaveBeenCalled();
  });

  it('strips internal reader seed markers from booklist descriptions before rendering', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      system_items: [
        {
          books: [],
          description:
            '更偏馆藏里当前能拿到的纸书，方便直接借阅。\n[reader_038_rich_seed_20260401]',
          id: 'seeded-list',
          title: '近期想借的纸书',
        },
      ],
    });

    const result = await listBooklists('reader-token');

    expect(result.systemItems[0]).toEqual(
      expect.objectContaining({
        description: '更偏馆藏里当前能拿到的纸书，方便直接借阅。',
        id: 'seeded-list',
        title: '近期想借的纸书',
      })
    );
  });
});
