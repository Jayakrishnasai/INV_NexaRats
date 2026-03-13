/**
 * Production-grade structured logger.
 * Zero external dependencies — wraps console with ISO timestamps, log levels, and module context.
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   const log = logger('SaleService');
 *   log.info('Processing sale', { orderId: '123' });
 *   log.error('Sale failed', err);
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    module: string;
    message: string;
    data?: unknown;
    stack?: string;
}

const formatEntry = (entry: LogEntry): string => {
    const base = `[${entry.timestamp}] [${entry.level}] [${entry.module}] ${entry.message}`;
    if (entry.data !== undefined) {
        try {
            const serialised = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
            return `${base} | ${serialised}`;
        } catch {
            return `${base} | [unserializable data]`;
        }
    }
    return base;
};

const createEntry = (level: LogLevel, module: string, message: string, data?: unknown): LogEntry => {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        module,
        message,
    };
    if (data instanceof Error) {
        entry.data = data.message;
        entry.stack = data.stack;
    } else if (data !== undefined) {
        entry.data = data;
    }
    return entry;
};

export interface Logger {
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, data?: unknown): void;
    debug(message: string, data?: unknown): void;
}

export const logger = (module: string): Logger => ({
    info(message: string, data?: unknown) {
        const entry = createEntry('INFO', module, message, data);
        console.log(formatEntry(entry));
    },
    warn(message: string, data?: unknown) {
        const entry = createEntry('WARN', module, message, data);
        console.warn(formatEntry(entry));
        if (entry.stack) console.warn(entry.stack);
    },
    error(message: string, data?: unknown) {
        const entry = createEntry('ERROR', module, message, data);
        console.error(formatEntry(entry));
        if (entry.stack) console.error(entry.stack);
    },
    debug(message: string, data?: unknown) {
        if (process.env.NODE_ENV === 'development') {
            const entry = createEntry('DEBUG', module, message, data);
            console.debug(formatEntry(entry));
        }
    },
});
