import { createAccountsApi } from '@/lib/api/domains/accounts';
import { createBooksApi } from '@/lib/api/domains/books';
import { createFamilyApi } from '@/lib/api/domains/family';
import { ApiError } from '@/lib/api/core/types';
import { createReportsApi } from '@/lib/api/domains/reports';
import { createShelfApi } from '@/lib/api/domains/shelf';
import { createUsersApi } from '@/lib/api/domains/users';
import { createVoiceChatApi } from '@/lib/api/domains/voice-chat';

export { ApiError } from '@/lib/api/core/types';

export function createBookshelfApiClient(baseUrl: string) {
  return {
    ...createUsersApi(baseUrl),
    ...createShelfApi(baseUrl),
    ...createBooksApi(baseUrl),
    ...createFamilyApi(baseUrl),
    ...createAccountsApi(baseUrl),
    ...createReportsApi(baseUrl),
    ...createVoiceChatApi(baseUrl),
  };
}
