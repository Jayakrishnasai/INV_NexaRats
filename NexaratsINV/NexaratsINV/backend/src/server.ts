import 'dotenv/config'; // MUST be first — loads .env before env.ts validates process.env
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const log = logger('Server');
const PORT = parseInt(env.PORT, 10);

import { analyticsService } from './services/analytics.service';

const server = app.listen(PORT, () => {
    log.info(`NexaRats Backend running on port ${PORT}`);
    log.info(`ENV: ${env.NODE_ENV}`);
    log.info(`CORS: ${env.CORS_ORIGIN}`);
    log.info(`Health: http://localhost:${PORT}/health`);

    // Initialize scheduled jobs
    analyticsService.initializeCron();
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
    log.warn(`${signal} received — shutting down gracefully...`);
    server.close(() => {
        log.info('HTTP server closed');
        process.exit(0);
    });
    // Force shutdown after 10s
    setTimeout(() => {
        log.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// FIX B9: Log full context for unhandled rejections
process.on('unhandledRejection', (reason) => {
    log.error('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (err) => {
    log.error('Uncaught Exception — process will exit', err);
    process.exit(1);
});
