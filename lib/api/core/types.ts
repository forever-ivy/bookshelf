import type { ZodType } from "zod";

/**
 * 支持的 HTTP 请求方法
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * URL 查询参数类型
 * 键为参数名，值为参数值（会自动转换为字符串）
 * null 和 undefined 的值会被过滤掉
 */
export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * 基础请求配置，继承自标准 RequestInit
 * 排除了 body、headers、method、signal，由我们自定义
 */
type BaseRequestConfig = Omit<
  RequestInit,
  "body" | "headers" | "method" | "signal"
> & {
  headers?: HeadersInit;
  method?: HttpMethod;
  signal?: AbortSignal;
  /** 请求超时时间（毫秒），默认 10000ms */
  timeoutMs?: number;
};

/**
 * 完整的请求配置类型
 * @template T 响应数据的类型，用于 Zod schema 校验
 */
export type RequestConfig<T = unknown> = BaseRequestConfig & {
  /** 请求体数据，普通对象会被自动 JSON 序列化 */
  data?: unknown;
  /** URL 查询参数，会自动拼接到 URL 后面 */
  params?: QueryParams;
  /** Zod schema，用于运行时校验响应数据 */
  schema?: ZodType<T>;
  /** 请求路径，如 '/api/users' */
  url: string;
};

/**
 * 请求选项类型，用于直接操作 body 的场景
 * 如上传 FormData、Blob 等
 */
export type RequestOptions = BaseRequestConfig & {
  body?: BodyInit | null;
};

/**
 * API 错误类
 * 封装了 HTTP 请求过程中可能发生的所有错误
 */
export class ApiError extends Error {
  /** 业务错误码，如 'UNAUTHORIZED', 'INVALID_RESPONSE' */
  code?: string;
  /** 详细错误信息，如 Zod 校验失败的具体字段 */
  details?: unknown;
  /** HTTP 状态码 (0=网络错误, 408=超时) */
  status: number;
  /** 请求的完整 URL */
  url: string;

  constructor(
    message: string,
    status: number,
    url: string,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
    this.code = code;
    this.details = details;
  }
}
