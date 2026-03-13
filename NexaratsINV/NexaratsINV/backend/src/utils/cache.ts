import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

const log = logger('CacheService');

class CacheService {
    private redis: Redis | null = null;
    private memoryFallback: Map<string, { value: any, expiresAt: number }> = new Map();

    constructor() {
        const redisUrl = (env as any).REDIS_URL;
        if (redisUrl) {
            this.redis = new Redis(redisUrl, {
                maxRetriesPerRequest: 1,
                retryStrategy: (times) => {
                    log.warn(`Redis connection failed (attempt ${times}). Using fallback.`);
                    return null; // Stop retrying, allow graceful degradation
                }
            });

            this.redis.on('error', (err) => {
                log.error('Redis Error:', err);
            });

            this.redis.on('connect', () => {
                log.info('Connected to Redis successfully');
            });
        } else {
            log.info('REDIS_URL not configured. Operating with in-memory fallback cache.');
        }
    }

    get isRedisAvailable(): boolean {
        return this.redis !== null && this.redis.status === 'ready';
    }

    getRedisClient(): Redis | undefined {
        return this.isRedisAvailable ? this.redis! : undefined;
    }

    async get<T>(key: string): Promise<T | null> {
        if (this.isRedisAvailable) {
            const data = await this.redis!.get(key);
            return data ? JSON.parse(data) : null;
        }

        // Memory Fallback
        const item = this.memoryFallback.get(key);
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
            this.memoryFallback.delete(key);
            return null;
        }
        return item.value as T;
    }

    async set(key: string, value: any, ttlSeconds: number): Promise<void> {
        if (this.isRedisAvailable) {
            await this.redis!.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            return;
        }

        // Memory Fallback
        this.memoryFallback.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    async del(key: string): Promise<void> {
        if (this.isRedisAvailable) {
            await this.redis!.del(key);
            return;
        }
        this.memoryFallback.delete(key);
    }

    async clearByPattern(pattern: string): Promise<void> {
        if (this.isRedisAvailable) {
            const keys = await this.redis!.keys(pattern);
            if (keys.length > 0) {
                await this.redis!.del(...keys);
            }
            return;
        }

        // Memory Fallback
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        for (const key of this.memoryFallback.keys()) {
            if (regex.test(key)) {
                this.memoryFallback.delete(key);
            }
        }
    }
}

export const cacheService = new CacheService();
