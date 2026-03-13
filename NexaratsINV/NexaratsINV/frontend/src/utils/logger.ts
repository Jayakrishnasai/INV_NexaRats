/**
 * Centrailized Logger for Observability
 */
const IS_PROD = import.meta.env.PROD;

export const logger = {
    info: (message: string, data?: any) => {
        if (!IS_PROD) console.log(`[INFO] ${message}`, data || '');
    },
    warn: (message: string, data?: any) => {
        console.warn(`[WARN] ${message}`, data || '');
    },
    error: (message: string, error?: any) => {
        console.error(`[ERROR] ${message}`, error || '');
        // In production, this is where you'd send to Sentry, etc.
        if (IS_PROD) {
            // mockSentry.captureException(error);
        }
    },
    trace: (message: string) => {
        if (!IS_PROD) console.trace(`[TRACE] ${message}`);
    }
};
