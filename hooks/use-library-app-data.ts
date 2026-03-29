import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBooklist,
  createBorrowOrder,
  createReturnRequest,
  getAchievements,
  getBook,
  getHomeFeed,
  getMe,
  getOrder,
  listActiveOrders,
  listBooklists,
  listBooks,
  listFavorites,
  listNotifications,
  listOrderHistory,
  login,
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

export function useBookSearchQuery(query: string) {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listBooks(query, token),
    queryKey: ['books', query, token],
  });
}

export function useRecommendationSearchQuery(query: string, enabled = true) {
  const { token } = useAppSession();

  return useQuery({
    enabled,
    queryFn: () => searchRecommendations(query, token),
    queryKey: ['recommendation-search', query, token],
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

export function useFavoritesQuery() {
  const { token } = useAppSession();

  return useQuery({
    queryFn: () => listFavorites(token),
    queryKey: ['favorites', token],
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
  const { identity, setSession, token } = useAppSession();

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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
