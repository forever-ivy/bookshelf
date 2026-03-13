import { accountSummarySchema, accountUserRelationSchema } from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';
import { z } from 'zod';

/**
 * 账户列表的 Zod 校验 schema
 * 用于校验 getAccounts 接口返回的数组
 */
const accountsSchema = z.array(accountSummarySchema);

/**
 * 账户用户关系的 Zod 校验 schema
 * 用于校验 getAccountUsers 接口返回的数组
 */
const accountUsersSchema = z.array(accountUserRelationSchema);

/**
 * 用户关联关系的 Zod 校验 schema
 * 用于校验 linkAccountUser 接口返回的对象
 */
const relationSchema = z.object({
  account_id: z.number(),
  created_at: z.string().optional(),
  id: z.number(),
  relation_type: z.string(),
  user_id: z.number(),
});

/**
 * 创建账户管理相关的 API
 * 包含账户的增删改查以及用户关联操作
 *
 * @param baseUrl - 服务器基础 URL
 * @returns 账户 API 方法集合
 *
 * @example
 * const accountsApi = createAccountsApi('http://api.example.com');
 *
 * // 获取所有账户
 * const accounts = await accountsApi.getAccounts();
 *
 * // 创建账户
 * const newAccount = await accountsApi.createAccount({ username: 'test', phone: '123' });
 *
 * // 关联用户到账户
 * await accountsApi.linkAccountUser(1, { user_id: 2, relation_type: 'owner' });
 */
export function createAccountsApi(baseUrl: string) {
  /** HTTP 客户端实例 */
  const http = createHttpClient(baseUrl);

  return {
    /**
     * 创建新账户
     * @param payload - 账户数据，如 { username, phone, password }
     * @returns 创建的账户信息
     */
    createAccount(payload: Record<string, unknown>) {
      return http.post('/api/accounts', {
        data: payload,
      });
    },

    /**
     * 删除账户
     * @param accountId - 要删除的账户 ID
     * @returns Promise<null>
     */
    deleteAccount(accountId: number) {
      return http.delete<null>(`/api/accounts/${accountId}`);
    },

    /**
     * 获取单个账户详情
     * @param accountId - 账户 ID
     * @returns 账户详情，包含 ID、用户名、手机号、状态等
     */
    getAccount(accountId: number) {
      return http.get(`/api/accounts/${accountId}`, { schema: accountSummarySchema });
    },

    /**
     * 获取账户关联的所有用户
     * @param accountId - 账户 ID
     * @returns 用户关联关系数组
     */
    getAccountUsers(accountId: number) {
      return http.get(`/api/accounts/${accountId}/users`, { schema: accountUsersSchema });
    },

    /**
     * 获取所有账户列表
     * @returns 账户数组
     */
    getAccounts() {
      return http.get('/api/accounts', { schema: accountsSchema });
    },

    /**
     * 将用户关联到账户
     * @param accountId - 账户 ID
     * @param payload - 关联信息
     * @param payload.user_id - 要关联的用户 ID
     * @param payload.relation_type - 关系类型，如 'owner', 'member'
     * @returns 创建的关联关系
     */
    linkAccountUser(accountId: number, payload: { relation_type?: string; user_id: number }) {
      return http.post(`/api/accounts/${accountId}/users`, {
        data: payload,
        schema: relationSchema,
      });
    },

    /**
     * 解除用户与账户的关联
     * @param accountId - 账户 ID
     * @param userId - 用户 ID
     * @returns Promise<null>
     */
    unlinkAccountUser(accountId: number, userId: number) {
      return http.delete<null>(`/api/accounts/${accountId}/users/${userId}`);
    },

    /**
     * 更新账户信息
     * @param accountId - 账户 ID
     * @param payload - 要更新的字段
     * @returns 更新后的账户信息
     */
    updateAccount(accountId: number, payload: Record<string, unknown>) {
      return http.put(`/api/accounts/${accountId}`, {
        data: payload,
      });
    },
  };
}
