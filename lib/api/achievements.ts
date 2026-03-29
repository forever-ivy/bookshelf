import type { AchievementSummary } from '@/lib/api/types';
import { getMockAchievements } from '@/lib/api/mock';
import { libraryRequest } from '@/lib/api/client';

export async function getAchievements(token?: string | null): Promise<AchievementSummary> {
  return libraryRequest('/api/v1/achievements/me', {
    fallback: getMockAchievements,
    method: 'GET',
    token,
  }).then((payload: any) => {
    if (!payload) {
      return getMockAchievements();
    }

    return {
      currentPoints: payload.currentPoints ?? payload.current_points ?? 0,
      streakLabel: payload.streakLabel ?? payload.streak_label ?? '连续学习 0 天',
      summary: payload.summary ?? {
        aiAssists: payload.ai_assists ?? 0,
        completedOrders: payload.completed_orders ?? 0,
        readingDays: payload.reading_days ?? 0,
        totalBorrowedBooks: payload.total_borrowed_books ?? 0,
      },
    };
  });
}
