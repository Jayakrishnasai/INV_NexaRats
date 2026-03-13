/**
 * In-memory session store and message log.
 * Replaces Mongoose models — no MongoDB needed.
 * The NexaratsINV backend handles persistence via Supabase.
 */

import crypto from 'crypto';

// ─── In-Memory Session Store ─────────────────────────────────────────────────
const sessionData = {
    sessionId: 'default',
    status: 'disconnected',
    phoneNumber: null,
    pushName: null,
    platform: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    totalMessagesSent: 0,
    totalMessagesFailed: 0,
    updatedAt: new Date(),
};

export const WhatsAppSession = {
    /** Mimic Mongoose findOne */
    findOne: async (filter) => {
        if (filter?.sessionId === sessionData.sessionId || !filter) {
            return { ...sessionData };
        }
        return null;
    },

    /** Mimic Mongoose findOneAndUpdate with upsert */
    findOneAndUpdate: async (_filter, update, _opts) => {
        Object.assign(sessionData, update, { updatedAt: new Date() });
        return { ...sessionData };
    },
};

// ─── In-Memory Message Log ───────────────────────────────────────────────────
const messageLogs = [];
const MAX_LOGS = 500; // Keep last 500 in memory

export const MessageLog = {
    /** Create a new log entry */
    create: async (data) => {
        const entry = {
            _id: crypto.randomUUID(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        messageLogs.unshift(entry); // newest first
        if (messageLogs.length > MAX_LOGS) messageLogs.pop();
        return entry;
    },

    /** Find by ID and update */
    findByIdAndUpdate: async (id, update) => {
        const entry = messageLogs.find(m => m._id === id);
        if (entry) {
            Object.assign(entry, update, { updatedAt: new Date() });
        }
        return entry || null;
    },

    /** Count with optional filter */
    countDocuments: async (filter = {}) => {
        return _filterLogs(filter).length;
    },

    /** Find with chainable sort/skip/limit (simplified) */
    find: (filter = {}) => {
        let results = _filterLogs(filter);
        return {
            sort: (sortOpt) => {
                if (sortOpt?.createdAt === -1) {
                    results.sort((a, b) => b.createdAt - a.createdAt);
                }
                return {
                    skip: (n) => {
                        results = results.slice(n);
                        return {
                            limit: (l) => Promise.resolve(results.slice(0, l)),
                        };
                    },
                    limit: (l) => Promise.resolve(results.slice(0, l)),
                };
            },
        };
    },
};

function _filterLogs(filter) {
    return messageLogs.filter(m => {
        if (filter.status && m.status !== filter.status) return false;
        if (filter.to) {
            const regex = filter.to.$regex || filter.to;
            if (!m.to?.includes(regex)) return false;
        }
        return true;
    });
}
