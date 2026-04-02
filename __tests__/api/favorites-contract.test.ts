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
  libraryFetchJson: jest.fn(),
  libraryRequest: jest.fn(),
}));

jest.mock('@/lib/api/mock', () => ({
  listMockFavorites: jest.fn(() => [
    {
      book: { author: 'mock', id: 99, summary: 'mock', title: 'mock' },
      id: 'mock-favorite',
    },
  ]),
  toggleMockFavorite: jest.fn(() => []),
}));

import { libraryFetchJson, libraryRequest } from '@/lib/api/client';
import { listMockFavorites, toggleMockFavorite } from '@/lib/api/mock';
import { listFavorites, toggleFavorite } from '@/lib/api/favorites';

describe('favorites contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid favorites payloads instead of silently falling back to mock data', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      data: [{ id: 7, title: '民族理论导论' }],
    });

    await expect(listFavorites('reader-token')).rejects.toMatchObject({
      code: 'favorites_invalid_payload',
      name: 'LibraryApiError',
      status: 500,
    });

    expect(listMockFavorites).not.toHaveBeenCalled();
  });

  it('propagates toggle failures instead of mutating mock favorites', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [
        {
          book: {
            author: '周志华',
            id: 1,
            summary: '适合课程导读。',
            title: '机器学习从零到一',
          },
          id: 'fav-1',
        },
      ],
    });
    (libraryFetchJson as jest.Mock).mockRejectedValue({
      code: 'http_500',
      name: 'LibraryApiError',
      status: 500,
    });

    await expect(toggleFavorite(1, 'reader-token')).rejects.toMatchObject({
      code: 'http_500',
      name: 'LibraryApiError',
      status: 500,
    });

    expect(toggleMockFavorite).not.toHaveBeenCalled();
  });

  it('passes query and category filters through to the reader favorites endpoint', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [],
    });

    await listFavorites('reader-token', {
      category: '人工智能',
      query: '推荐',
    });

    expect(libraryRequest).toHaveBeenCalledWith(
      '/api/v1/favorites/books?query=%E6%8E%A8%E8%8D%90&category=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD',
      expect.objectContaining({
        method: 'GET',
        token: 'reader-token',
      })
    );
  });
});
