import { normalizeBaseUrl } from "@/lib/app/connection";
import {
  ApiError,
  type QueryParams,
  type RequestConfig,
  type RequestOptions,
} from "@/lib/api/core/types";
import { z, type ZodType } from "zod";

/**
 * 后端可能返回的响应格式
 * 支持标准信封格式 { ok, data, message } 或原始数据
 */
type EnvelopeLike =
  | {
      ok: boolean;
      data?: unknown;
      message?: unknown;
      msg?: unknown;
      error?: unknown;
      code?: unknown;
      [key: string]: unknown;
    }
  | Record<string, unknown>
  | unknown[]
  | string
  | null;

/**
 * 规范化后的响应信封结构
 * 无论后端返回什么格式，最终都会被转换为这个标准结构
 */
type NormalizedEnvelope = {
  ok: boolean;
  data: unknown;
  message?: string;
  error?: {
    code?: string;
    details?: unknown;
  };
};

/**
 * 内部请求配置，扩展 RequestConfig 以支持原始 body
 */
type InternalRequestConfig<T = unknown> = RequestConfig<T> & {
  body?: BodyInit | null;
};

/** 默认请求超时时间：10秒 */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * 检查值是否为普通对象（不是数组、null、Date 等）
 * @param value - 要检查的值
 * @returns 是否为普通对象
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 检查值是否为 FormData
 * 用于判断是否需要设置 Content-Type
 */
function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

/**
 * 检查值是否为可以直接作为请求体的类型
 * 包括：string、Blob、ArrayBuffer、FormData、URLSearchParams 等
 */
function isBodyInitValue(value: unknown): value is BodyInit {
  if (typeof value === "string") {
    return true;
  }

  if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) {
    return true;
  }

  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return true;
  }

  if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) {
    return true;
  }

  return ArrayBuffer.isView(value) || isFormData(value);
}

/**
 * 解析请求体
 * 优先级：body > data
 * 普通对象会被 JSON 序列化，FormData/Blob 等保持原样
 */
function resolveRequestBody({
  body,
  data,
}: Pick<InternalRequestConfig, "body" | "data">) {
  if (body !== undefined) {
    return body;
  }

  if (data == null) {
    return undefined;
  }

  if (isBodyInitValue(data)) {
    return data;
  }

  return JSON.stringify(data);
}

/**
 * 构建请求头
 * 如果请求体是 JSON（非 FormData），自动设置 Content-Type
 */
function buildHeaders(
  headersInit: HeadersInit | undefined,
  body: BodyInit | null | undefined,
) {
  const headers = new Headers(headersInit);
  const hasJsonBody = body != null && !isFormData(body);

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

/**
 * 构建完整的请求 URL
 * 支持绝对路径和相对路径，自动拼接查询参数
 */
function buildRequestUrl(
  baseUrl: string,
  path: string,
  params?: QueryParams,
) {
  // 如果 path 是绝对 URL（以 http 开头），直接使用
  const fullURL = path.startsWith("http")
    ? path
    : `${normalizeBaseUrl(baseUrl)}${path}`;

  if (!params) {
    return fullURL;
  }

  const url = new URL(fullURL);

  // 遍历参数，过滤掉 null 和空字符串
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

/**
 * 从响应中提取错误消息
 * 支持多种后端错误格式：message、msg、error 等
 */
function extractMessage(raw: EnvelopeLike, status: number) {
  if (typeof raw === "string" && raw) {
    return raw;
  }

  if (isPlainObject(raw)) {
    const message =
      raw.message ??
      raw.msg ??
      (typeof raw.error === "string" ? raw.error : undefined);

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return `Request failed with status ${status}`;
}

/**
 * 规范化响应信封
 * 将后端可能返回的各种格式统一转换为标准结构
 *
 * 支持的后端格式：
 * 1. 标准信封: { ok: true, data: {...} }
 * 2. 标准错误: { ok: false, message: "...", error: {...} }
 * 3. 原始数据: 直接返回对象或数组
 * 4. 纯文本: "error message"
 */
function normalizeEnvelope(
  raw: EnvelopeLike,
  response: Response,
): NormalizedEnvelope {
  // 处理标准信封格式（包含 ok 字段的对象）
  if (isPlainObject(raw) && typeof raw.ok === "boolean") {
    if (raw.ok) {
      // 成功响应
      if ("data" in raw) {
        return {
          data: raw.data,
          message:
            typeof raw.message === "string"
              ? raw.message
              : typeof raw.msg === "string"
                ? raw.msg
                : undefined,
          ok: true,
        };
      }

      // 没有 data 字段，将其他字段作为数据
      const { ok: _ok, message, msg, ...rest } = raw;
      const normalizedData = Object.keys(rest).length ? rest : null;

      return {
        data: normalizedData,
        message:
          typeof message === "string"
            ? message
            : typeof msg === "string"
              ? msg
              : undefined,
        ok: true,
      };
    }

    // 失败响应，规范化错误信息
    const normalizedError = isPlainObject(raw.error)
      ? {
          code:
            typeof raw.error.code === "string"
              ? raw.error.code
              : typeof raw.code === "string"
                ? raw.code
                : undefined,
          details: raw.error.details,
        }
      : {
          code: typeof raw.code === "string" ? raw.code : undefined,
          details:
            typeof raw.error === "string"
              ? undefined
              : isPlainObject(raw)
                ? Object.fromEntries(
                    Object.entries(raw).filter(
                      ([key]) =>
                        ![
                          "ok",
                          "data",
                          "message",
                          "msg",
                          "error",
                          "code",
                        ].includes(key),
                    ),
                  )
                : undefined,
        };

    return {
      data: null,
      error: normalizedError,
      message: extractMessage(raw, response.status),
      ok: false,
    };
  }

  // 非标准格式但 HTTP 状态成功，直接将原始数据作为 data
  if (response.ok) {
    return {
      data: raw,
      ok: true,
    };
  }

  // 非标准格式且 HTTP 状态失败
  return {
    data: null,
    error: undefined,
    message: extractMessage(raw, response.status),
    ok: false,
  };
}

/**
 * 解析响应体
 * 根据 Content-Type 自动选择解析方式
 * 204 状态码返回 null
 */
async function parseResponseBody(response: Response): Promise<EnvelopeLike> {
  if (response.status === 204) {
    return null;
  }

  const contentType =
    typeof response.headers?.get === "function"
      ? (response.headers.get("content-type") ?? "")
      : "";
  const canReadJson = typeof response.json === "function";
  const canReadText = typeof response.text === "function";

  // JSON 响应
  if (contentType.includes("application/json")) {
    return (await response.json().catch(() => null)) as EnvelopeLike;
  }

  // 纯文本响应
  if (canReadText) {
    const text = await response.text().catch(() => "");
    return text || null;
  }

  // 兜底：尝试 JSON
  if (canReadJson) {
    return (await response.json().catch(() => null)) as EnvelopeLike;
  }

  return null;
}

/**
 * 使用 Zod schema 校验响应数据
 * 校验失败会抛出 ApiError
 */
function validatePayload<T>(data: unknown, schema: ZodType<T>, url: string) {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ApiError(
      "Invalid response payload",
      500,
      url,
      "INVALID_RESPONSE",
      result.error.flatten(),
    );
  }

  return result.data;
}

/**
 * 执行 HTTP 请求的核心函数
 * 处理完整的请求生命周期：构建 URL、发送请求、解析响应、错误处理、数据校验
 *
 * @template T 响应数据的期望类型
 * @param baseUrl - 服务器基础 URL
 * @param config - 请求配置
 * @returns Promise<T> 类型安全的响应数据
 * @throws {ApiError} 请求失败时抛出
 */
async function executeRequest<T>(
  baseUrl: string,
  config: InternalRequestConfig<T>,
): Promise<T> {
  const {
    body,
    data,
    headers: headersInit,
    method = "GET",
    params,
    schema,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    url: path,
    ...fetchInit
  } = config;

  // 设置超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const url = buildRequestUrl(baseUrl, path, params);
  const resolvedBody = resolveRequestBody({ body, data });

  try {
    // 发送请求
    const response = await fetch(url, {
      ...fetchInit,
      body: resolvedBody,
      headers: buildHeaders(headersInit, resolvedBody),
      method,
      signal: signal ?? controller.signal,
    });

    // 解析响应
    const rawBody = await parseResponseBody(response);
    const envelope = normalizeEnvelope(rawBody, response);

    // 检查业务错误或 HTTP 错误
    if (!envelope.ok || !response.ok) {
      throw new ApiError(
        envelope.message ?? `Request failed with status ${response.status}`,
        response.status,
        url,
        envelope.error?.code,
        envelope.error?.details,
      );
    }

    // 无 schema 时直接返回（类型断言）
    if (!schema) {
      return envelope.data as T;
    }

    // 有 schema 时进行运行时校验
    return validatePayload(envelope.data, schema, url);
  } catch (error) {
    // 重新抛出已处理的 ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    // 超时错误
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Request timed out", 408, url, "TIMEOUT");
    }

    // 网络错误
    throw new ApiError("Network error", 0, url, "NETWORK_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 传统风格的 JSON 请求函数
 * 向后兼容，内部使用 executeRequest
 *
 * @template T 响应数据类型
 * @param baseUrl - 服务器基础 URL
 * @param path - API 路径
 * @param options - 请求选项
 * @param schema - 可选的 Zod 校验 schema
 * @returns Promise<T>
 */
export async function requestJson<T>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
  schema?: ZodType<T>,
): Promise<T> {
  return executeRequest(baseUrl, {
    ...options,
    schema,
    url: path,
  });
}

/**
 * 创建 HTTP 客户端实例
 * 提供语义化的 HTTP 方法（get/post/put/patch/delete）
 *
 * @param baseUrl - 服务器基础 URL，所有请求都会基于此 URL
 * @returns HTTP 客户端对象
 *
 * @example
 * const http = createHttpClient('http://api.example.com');
 *
 * // GET 请求
 * const users = await http.get('/api/users', { schema: usersSchema });
 *
 * // POST 请求
 * const newUser = await http.post('/api/users', {
 *   data: { name: '张三' },
 *   schema: userSchema
 * });
 *
 * // 带查询参数
 * const pagedUsers = await http.get('/api/users', {
 *   params: { page: 1, limit: 10 }
 * });
 */
export function createHttpClient(baseUrl: string) {
  return {
    /**
     * 发送 DELETE 请求
     * @template T 响应数据类型
     */
    delete<T>(
      url: string,
      config: Omit<RequestConfig<T>, "method" | "url"> = {},
    ) {
      return executeRequest<T>(baseUrl, {
        ...config,
        method: "DELETE",
        url,
      });
    },

    /**
     * 发送 GET 请求
     * @template T 响应数据类型
     */
    get<T>(
      url: string,
      config: Omit<RequestConfig<T>, "method" | "url"> = {},
    ) {
      return executeRequest<T>(baseUrl, {
        ...config,
        method: "GET",
        url,
      });
    },

    /**
     * 发送 PATCH 请求（部分更新）
     * @template T 响应数据类型
     */
    patch<T>(
      url: string,
      config: Omit<RequestConfig<T>, "method" | "url"> = {},
    ) {
      return executeRequest<T>(baseUrl, {
        ...config,
        method: "PATCH",
        url,
      });
    },

    /**
     * 发送 POST 请求（创建资源）
     * @template T 响应数据类型
     */
    post<T>(
      url: string,
      config: Omit<RequestConfig<T>, "method" | "url"> = {},
    ) {
      return executeRequest<T>(baseUrl, {
        ...config,
        method: "POST",
        url,
      });
    },

    /**
     * 发送 PUT 请求（全量更新）
     * @template T 响应数据类型
     */
    put<T>(
      url: string,
      config: Omit<RequestConfig<T>, "method" | "url"> = {},
    ) {
      return executeRequest<T>(baseUrl, {
        ...config,
        method: "PUT",
        url,
      });
    },

    /**
     * 发送任意配置的请求
     * 当需要完全自定义请求配置时使用
     * @template T 响应数据类型
     */
    request<T>(config: RequestConfig<T>) {
      return executeRequest<T>(baseUrl, config);
    },
  };
}

/**
 * 构建带查询参数的 URL 路径
 * 将对象转换为查询字符串并拼接到路径上
 *
 * @param path - 基础路径，如 '/api/users'
 * @param params - 查询参数对象
 * @returns 完整路径，如 '/api/users?page=1&limit=10'
 *
 * @example
 * withSearchParams('/api/users', { page: 1, search: null })
 * // 返回: '/api/users?page=1'（null 值被过滤）
 */
export function withSearchParams(path: string, params: QueryParams) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") {
      return;
    }
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** 未知记录类型的 Zod schema，用于灵活的数据校验 */
export const unknownRecordSchema = z.record(z.string(), z.unknown());

export { ApiError };
export type { QueryParams, RequestConfig, RequestOptions } from "@/lib/api/core/types";
