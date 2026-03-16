import {
  authSessionSchema,
  pairExchangeSchema,
  pairIssueSchema,
} from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';

export function createAuthApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    exchangePairCode(pairCode: string) {
      return http.post('/api/auth/pair/exchange', {
        data: { pair_code: pairCode },
        schema: pairExchangeSchema,
      });
    },
    issuePairCode() {
      return http.post('/api/auth/pair/issue', {
        schema: pairIssueSchema,
      });
    },
    login(payload: { password: string; username: string }) {
      return http.post('/api/auth/login', {
        data: payload,
        schema: authSessionSchema,
      });
    },
    logout() {
      return http.post<null>('/api/auth/logout');
    },
    me() {
      return http.get('/api/auth/me', { schema: authSessionSchema });
    },
    register(payload: {
      family_name?: string;
      name: string;
      pair_token: string;
      password: string;
      username: string;
    }) {
      return http.post('/api/auth/register', {
        data: payload,
        schema: authSessionSchema,
      });
    },
  };
}
