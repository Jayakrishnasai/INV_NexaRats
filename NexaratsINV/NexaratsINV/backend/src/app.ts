import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { globalRateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import apiRoutes from './routes/index';

const app = express();

// ─── Trust Proxy for correct IP behind load balancers ─────────────────────────
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        // In development: allow any localhost port so Vite can use 3000, 5173, etc.
        if (env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) {
            return callback(null, true);
        }
        // In production: only allow the configured origin
        if (origin === env.CORS_ORIGIN) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Store-Token'],
    credentials: true,
}));

// ─── Cookie Parser (FIX B1: required for httpOnly cookie auth) ───────────────
app.use(cookieParser());

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));


// Note: Input sanitization is handled by Zod schema validation on every route.
// Helmet provides XSS-protection headers. xss-clean was removed (unmaintained since 2021).


// ─── Request Logging ─────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Global Rate Limiting ─────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
});

// ─── Centralized Error Handler ────────────────────────────────────────────────
// Must be last middleware — Express identifies error handlers by 4 parameters
app.use(errorHandler);

export default app;
