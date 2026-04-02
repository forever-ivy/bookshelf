import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelBorrowOrder,
  createBooklist,
  createBorrowOrder,
  createReturnRequest,
  getAchievements,
  getBook,
  getCollaborativeBooks,
  getHomeFeed,
  getHybridBooks,
  listCatalogCategories,
  getMe,
  getOrder,
  getPersonalizedRecommendations,
  getRecommendationDashboard,
  getReturnRequest,
  getSimilarBooks,
  getMyOverview,
  listActiveOrders,
  listBooklists,
  listBooksPage,
  listBorrowOrders,
  listBooks,
  listFavorites,
  listMyOrders,
  listNotifications,
  listOrderHistory,
  listReturnRequests,
  login,
  searchBooksExplicit,
  registerReader,
  renewBorrowOrder,
  searchRecommendations,
  toggleFavorite,
  updateMyProfile,
  type LoginInput,
  type ProfileUpdateInput,
  type RegisterInput,
} from '@/lib/api';
import { useAppSession } from '@/hooks/use-app-session';

function withToken<T>(token: string | null | undefined, callback: (token?: string | null) => Promise<T>) {
  return callback(token);
}

export function useSessionIdentityQuery() {
  const { token } = useAppSession();

  return useQuery({
    enabled: Boolean(token),
    queryFn: () => withToken(token, getMe),
    queryKey: ['session', token],
  });
}

export function useHomeFeedQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => withToken(token, getHomeFeed),
    queryKey: ['home-feed', token],
  });
}

export function useBookSearchQuery(query: string, enabled = true) {
  const { token } = useAppSession();

  return useQuery({
    enabled,
    queryFn: () => listBooks(query, token),
    queryKey: ['books', query, token],
  });
}

export function useCatalogBookSearchPageQuery(
  query: string,
  options: {
    category?: string | null;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { token } = useAppSession();
  const category = options.category ?? null;
  const enabled = options.enabled ?? true;
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  return useQuery({
    enabled,
    queryFn: () => listBooksPage(query, token, { category, limit, offset }),
    queryKey: ['books', 'catalog-page', query, category, limit, offset, token],
  });
}

export function useExplicitBookSearchQuery(
  query: string,
  options: {
    category?: string | null;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { token } = useAppSession();
  const category = options.category ?? null;
  const enabled = options.enabled ?? true;
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  return useQuery({
    enabled: enabled && query.trim().length > 0,
    queryFn: () => searchBooksExplicit(query, token, { category, limit, offset }),
    queryKey: ['books', 'explicit-search', query, category, limit, offset, token],
  });
}

export function useRecommendationSearchQuery(
  query: string,
  enabled = true,
  options: { limit?: number } = {}
) {
  const { token } = useAppSession();
  const limit = options.limit ?? 5;

  return useQuery({
    enabled,
    queryFn: () => searchRecommendations(query, token, { limit }),
    queryKey: ['recommendation-search', query, limit, token],
  });
}

export function useBookDetailQuery(bookId: number) {
  const { token } = useAppSession();

  return useQuery({
    enabled: Number.isFinite(bookId),
    queryFn: () => getBook(bookId, token),
    queryKey: ['book', bookId, token],
  });
}

export function useBookDetailQueries(bookIds: number[]) {
  const { token } = useAppSession();
  const uniqueBookIds = Array.from(new Set(bookIds.filter((bookId) => Number.isFinite(bookId))));

  return useQueries({
    queries: uniqueBookIds.map((bookId) => ({
      enabled: Number.isFinite(bookId),
      queryFn: () => getBook(bookId, token),
      queryKey: ['book', 'detail', bookId, token],
    })),
  });
}

export function useRecommendationDashboardQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => getRecommendationDashboard(token),
    queryKey: ['recommendation', 'dashboard', token],
  });
}

export function usePersonalizedRecommendationsQuery(options: { historyLimit?: number; limit?: number } = {}) {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => getPersonalizedRecommendations(token, options),
    queryKey: ['recommendation', 'personalized', options.historyLimit ?? 3, options.limit ?? 5, token],
  });
}

export function useSimilarBooksQuery(bookId: number, limit = 5) {
  const { token } = useAppSession();

  return useQuery({
    enabled: Number.isFinite(bookId),
    queryFn: () => getSimilarBooks(bookId, token, limit),
    queryKey: ['recommendation', 'similar', bookId, limit, token],
  });
}

export function useCollaborativeBooksQuery(bookId: number, limit = 5) {
  const { token } = useAppSession();

  return useQuery({
    enabled: Number.isFinite(bookId),
    queryFn: () => getCollaborativeBooks(bookId, token, limit),
    queryKey: ['recommendation', 'collaborative', bookId, limit, token],
  });
}

export function useHybridBooksQuery(bookId: number, limit = 5) {
  const { token } = useAppSession();

  return useQuery({
    enabled: Number.isFinite(bookId),
    queryFn: () => getHybridBooks(bookId, token, limit),
    queryKey: ['recommendation', 'hybrid', bookId, limit, token],
  });
}

export function useActiveOrdersQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listActiveOrders(token),
    queryKey: ['orders', 'active', token],
  });
}

export function useOrderHistoryQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listOrderHistory(token),
    queryKey: ['orders', 'history', token],
  });
}

export function useOrderDetailQuery(orderId: number) {
  const { token } = useAppSession();

  return useQuery({
    enabled: Number.isFinite(orderId),
    queryFn: () => getOrder(orderId, token),
    queryKey: ['orders', 'detail', orderId, token],
  });
}

export function useBorrowOrdersQuery(
  filters: {
    activeOnly?: boolean;
    status?: string | null;
  } = {}
) {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listBorrowOrders(filters, token),
    queryKey: ['orders', 'list', filters.status ?? null, filters.activeOnly ?? false, token],
  });
}

export function useReturnRequestsQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listReturnRequests(token),
    queryKey: ['orders', 'return-requests', token],
  });
}

export function useReturnRequestDetailQuery(returnRequestId: number) {
  const { token } = useAppSession();

  return useQuery({
    enabled: Number.isFinite(returnRequestId),
    queryFn: () => getReturnRequest(returnRequestId, token),
    queryKey: ['orders', 'return-request-detail', returnRequestId, token],
  });
}

export function useCatalogCategoriesQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listCatalogCategories(token),
    queryKey: ['catalog', 'categories', token],
  });
}

export function useFavoritesQuery(
  filters: {
    category?: string | null;
    query?: string;
  } = {}
) {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listFavorites(token, filters),
    queryKey: ['favorites', filters.query ?? '', filters.category ?? null, token],
  });
}

export function useMyOverviewQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => getMyOverview(token),
    queryKey: ['readers', 'overview', token],
  });
}

export function useMyOrdersQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listMyOrders(token),
    queryKey: ['readers', 'orders', token],
  });
}

export function useBooklistsQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listBooklists(token),
    queryKey: ['booklists', token],
  });
}

export function useNotificationsQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listNotifications(token),
    queryKey: ['notifications', token],
  });
}

export function useAchievementsQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => getAchievements(token),
    queryKey: ['achievements', token],
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (input: RegisterInput) => registerReader(input),
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const { identity, refreshToken, setSession, token } = useAppSession();

  return useMutation({
    mutationFn: (payload: ProfileUpdateInput) => updateMyProfile(token, payload),
    onSuccess: async (sessionSnapshot) => {
      if (!identity || !token) {
        return;
      }

      await setSession({
        identity,
        onboarding: sessionSnapshot.onboarding,
        profile: sessionSnapshot.profile,
        refreshToken,
        token,
      });
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

export function useCreateBorrowOrderMutation() {
  const queryClient = useQueryClient();
  const { token } = useAppSession();

  return useMutation({
    mutationFn: (input: Parameters<typeof createBorrowOrder>[0]) => createBorrowOrder(input, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readers', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['readers', 'overview'] });
    },
  });
}

export function useRenewBorrowOrderMutation() {
  const queryClient = useQueryClient();
  const { token } = useAppSession();

  return useMutation({
    mutationFn: (orderId: number) => renewBorrowOrder(orderId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readers', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['readers', 'overview'] });
    },
  });
}

export function useCancelBorrowOrderMutation() {
  const queryClient = useQueryClient();
  const { token } = useAppSession();

  return useMutation({
    mutationFn: (orderId: number) => cancelBorrowOrder(orderId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readers', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['readers', 'overview'] });
    },
  });
}

export function useReturnRequestMutation() {
  const queryClient = useQueryClient();
  const { token } = useAppSession();

  return useMutation({
    mutationFn: (orderId: number) => createReturnRequest(orderId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readers', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['readers', 'overview'] });
    },
  });
}

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();
  const { token } = useAppSession();

  return useMutation({
    mutationFn: (bookId: number) => toggleFavorite(bookId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useCreateBooklistMutation() {
  const queryClient = useQueryClient();
  const { token } = useAppSession();

  return useMutation({
    mutationFn: (input: Parameters<typeof createBooklist>[0]) => createBooklist(input, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booklists'] });
    },
  });
}
