import { createClient } from 'redis';

const DEFAULT_PREFIX = 'learning-ai-stream';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

function nowIso() {
  return new Date().toISOString();
}

export class MemoryResumableStreamStore {
  constructor() {
    this.streams = new Map();
  }

  async initStream(streamId, metadata = {}) {
    this.streams.set(streamId, {
      chunks: [],
      metadata,
      status: 'running',
      updatedAt: nowIso(),
    });
  }

  async appendChunk(streamId, chunk) {
    const record = this.streams.get(streamId);
    if (!record) {
      return;
    }
    record.chunks.push(String(chunk));
    record.updatedAt = nowIso();
  }

  async consumeSseStream(streamId, stream) {
    for await (const chunk of stream) {
      await this.appendChunk(streamId, chunk);
    }
  }

  async getChunks(streamId, cursor = 0) {
    const record = this.streams.get(streamId);
    if (!record) {
      return null;
    }
    return record.chunks.slice(cursor);
  }

  async getState(streamId) {
    const record = this.streams.get(streamId);
    if (!record) {
      return null;
    }
    return {
      status: record.status,
      updatedAt: record.updatedAt,
    };
  }

  async markCompleted(streamId) {
    const record = this.streams.get(streamId);
    if (!record) {
      return;
    }
    record.status = 'completed';
    record.updatedAt = nowIso();
  }

  async markFailed(streamId) {
    const record = this.streams.get(streamId);
    if (!record) {
      return;
    }
    record.status = 'failed';
    record.updatedAt = nowIso();
  }
}

export class RedisResumableStreamStore {
  constructor(url, options = {}) {
    this.client = createClient({ url });
    this.prefix = options.prefix ?? DEFAULT_PREFIX;
    this.ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    this.connectPromise = null;
  }

  chunksKey(streamId) {
    return `${this.prefix}:${streamId}:chunks`;
  }

  metaKey(streamId) {
    return `${this.prefix}:${streamId}:meta`;
  }

  async connect() {
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect();
    }
    await this.connectPromise;
  }

  async initStream(streamId, metadata = {}) {
    await this.connect();
    const timestamp = nowIso();
    await this.client.del(this.chunksKey(streamId), this.metaKey(streamId));
    await this.client.hSet(this.metaKey(streamId), {
      metadata: JSON.stringify(metadata),
      status: 'running',
      updatedAt: timestamp,
    });
    await this.client.expire(this.metaKey(streamId), this.ttlSeconds);
  }

  async appendChunk(streamId, chunk) {
    await this.connect();
    const value = String(chunk);
    await this.client.rPush(this.chunksKey(streamId), value);
    await this.client.expire(this.chunksKey(streamId), this.ttlSeconds);
    await this.client.hSet(this.metaKey(streamId), {
      updatedAt: nowIso(),
    });
    await this.client.expire(this.metaKey(streamId), this.ttlSeconds);
  }

  async consumeSseStream(streamId, stream) {
    for await (const chunk of stream) {
      await this.appendChunk(streamId, chunk);
    }
  }

  async getChunks(streamId, cursor = 0) {
    await this.connect();
    const exists = await this.client.exists(this.metaKey(streamId));
    if (!exists) {
      return null;
    }
    return await this.client.lRange(this.chunksKey(streamId), cursor, -1);
  }

  async getState(streamId) {
    await this.connect();
    const record = await this.client.hGetAll(this.metaKey(streamId));
    if (!record || !record.status) {
      return null;
    }
    return {
      status: record.status,
      updatedAt: record.updatedAt ?? null,
    };
  }

  async markCompleted(streamId) {
    await this.connect();
    await this.client.hSet(this.metaKey(streamId), {
      completedAt: nowIso(),
      status: 'completed',
      updatedAt: nowIso(),
    });
    await this.client.expire(this.metaKey(streamId), this.ttlSeconds);
  }

  async markFailed(streamId) {
    await this.connect();
    await this.client.hSet(this.metaKey(streamId), {
      completedAt: nowIso(),
      status: 'failed',
      updatedAt: nowIso(),
    });
    await this.client.expire(this.metaKey(streamId), this.ttlSeconds);
  }
}

let cachedStreamStore = null;

function resolveRedisUrl(env = process.env) {
  return env.LIBRARY_REDIS_URL || env.REDIS_URL || '';
}

export function createStreamStore(env = process.env) {
  if (cachedStreamStore) {
    return cachedStreamStore;
  }

  const redisUrl = resolveRedisUrl(env);
  cachedStreamStore = redisUrl
    ? new RedisResumableStreamStore(redisUrl)
    : new MemoryResumableStreamStore();
  return cachedStreamStore;
}

