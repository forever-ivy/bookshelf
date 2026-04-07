import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockRouter = {
  push: jest.fn(),
};

const mockCreateBooklistMutation = {
  isPending: false,
  mutateAsync: jest.fn(),
};
const mockDeleteBooklistMutation = {
  isPending: false,
  mutateAsync: jest.fn(),
};

const mockCustomBooklists = [
  { books: [], description: '默认稍后阅读。', id: 'watch-later', source: 'custom', title: '稍后再看' },
  { books: [], description: '课程参考书先放这里。', id: 'custom-1', source: 'custom', title: '课程导读' },
  { books: [], description: '论文阶段要补的基础材料。', id: 'custom-2', source: 'custom', title: '毕业设计' },
  { books: [], description: '把接下来要借的纸书整理在一起。', id: 'custom-3', source: 'custom', title: '近期想借' },
  { books: [], description: '答辩前集中复习。', id: 'custom-4', source: 'custom', title: '答辩冲刺' },
];

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('sonner-native', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useBooklistsQuery: () => ({
    data: {
      customItems: mockCustomBooklists,
      systemItems: [{ books: [], description: '系统不显示', id: 'system-1', source: 'system', title: '系统书单' }],
    },
    isFetching: false,
  }),
  useCreateBooklistMutation: () => mockCreateBooklistMutation,
  useDeleteBooklistMutation: () => mockDeleteBooklistMutation,
  useFavoritesQuery: () => ({
    data: [],
    isError: false,
    isFetching: false,
  }),
}));

import { FavoritesTabContent } from '@/components/favorites/favorites-tab-content';

describe('FavoritesTabContent', () => {
  beforeEach(() => {
    mockRouter.push.mockReset();
    mockCreateBooklistMutation.isPending = false;
    mockCreateBooklistMutation.mutateAsync.mockReset();
    mockDeleteBooklistMutation.isPending = false;
    mockDeleteBooklistMutation.mutateAsync.mockReset();
    mockCreateBooklistMutation.mutateAsync.mockResolvedValue({
      books: [],
      description: '论文资料',
      id: 'created-booklist',
      source: 'custom',
      title: '毕业设计',
    });
    mockDeleteBooklistMutation.mutateAsync.mockResolvedValue({ ok: true });
  });

  it('renders custom booklists in one panel and expands beyond the default three items', () => {
    render(<FavoritesTabContent />);

    expect(screen.getByTestId('favorites-booklists-panel')).toBeTruthy();
    expect(screen.getByText('我的书单')).toBeTruthy();
    expect(screen.getByTestId('favorites-booklists-create')).toBeTruthy();
    expect(screen.getByTestId('favorites-booklists-delete')).toBeTruthy();
    expect(screen.getByText('稍后再看')).toBeTruthy();
    expect(screen.getByText('课程导读')).toBeTruthy();
    expect(screen.getByText('毕业设计')).toBeTruthy();
    expect(screen.queryByText('近期想借')).toBeNull();
    expect(screen.queryByText('答辩冲刺')).toBeNull();
    expect(screen.queryByText('系统书单')).toBeNull();
    expect(screen.getByTestId('favorites-booklists-toggle')).toBeTruthy();

    fireEvent.press(screen.getByTestId('favorites-booklists-toggle'));

    expect(screen.getByText('近期想借')).toBeTruthy();
    expect(screen.getByText('答辩冲刺')).toBeTruthy();
    expect(screen.getByText('收起')).toBeTruthy();

    fireEvent.press(screen.getByTestId('favorites-booklists-toggle'));

    expect(screen.queryByText('答辩冲刺')).toBeNull();
  });

  it('opens the create modal and submits a new custom booklist', async () => {
    render(<FavoritesTabContent />);

    fireEvent.press(screen.getByTestId('favorites-booklists-create'));

    expect(screen.getByTestId('favorites-booklists-create-modal')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('favorites-booklist-title-input'), '毕业设计');
    fireEvent.changeText(screen.getByTestId('favorites-booklist-description-input'), '论文资料');
    fireEvent.press(screen.getByTestId('favorites-booklist-submit'));

    await waitFor(() => {
      expect(mockCreateBooklistMutation.mutateAsync).toHaveBeenCalledWith({
        bookIds: [],
        description: '论文资料',
        title: '毕业设计',
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('favorites-booklists-create-modal')).toBeNull();
    });
  });

  it('opens the delete modal and excludes watch-later from deletable booklists', async () => {
    render(<FavoritesTabContent />);

    fireEvent.press(screen.getByTestId('favorites-booklists-delete'));

    expect(screen.getByTestId('favorites-booklists-delete-modal')).toBeTruthy();
    expect(screen.queryByTestId('favorites-booklist-delete-watch-later')).toBeNull();
    expect(screen.getByTestId('favorites-booklist-delete-custom-1')).toBeTruthy();

    fireEvent.press(screen.getByTestId('favorites-booklist-delete-custom-1'));

    await waitFor(() => {
      expect(mockDeleteBooklistMutation.mutateAsync).toHaveBeenCalledWith('custom-1');
    });
  });
});
