import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const log = logger('ErrorHandler');

export const errorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void => {
    const reqContext = `${req.method} ${req.originalUrl} [${req.ip}]`;

    // ── Malformed JSON body (Express body-parser throws SyntaxError) ─────────
    if (err instanceof SyntaxError && 'body' in err) {
        log.warn('Malformed JSON body', { path: reqContext });
        res.status(400).json({
            success: false,
            error: 'Malformed JSON in request body',
            code: 'INVALID_JSON',
        });
        return;
    }

    // ── Payload too large ───────────────────────────────────────────────────
    if (err instanceof Error && err.message?.includes('entity too large')) {
        log.warn('Payload too large', { path: reqContext });
        res.status(413).json({
            success: false,
            error: 'Request body too large. Maximum size is 5MB.',
            code: 'PAYLOAD_TOO_LARGE',
        });
        return;
    }

    // ── Validation errors (Zod) ─────────────────────────────────────────────
    if (err instanceof ValidationError) {
        log.warn(`Validation failed: ${err.message}`, { 
            path: reqContext,
            details: JSON.stringify(err.errors) 
        });
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            code: err.code,
            errors: err.errors,
        });
        return;
    }

    // ── Operational errors — thrown intentionally by our code ────────────────
    if (err instanceof AppError && err.isOperational) {
        log.warn(`${err.code}: ${err.message}`, { path: reqContext });
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            code: err.code,
        });
        return;
    }

    // ── Unknown / programming errors — log full error, return generic ───────
    log.error(`Unhandled error on ${reqContext}`, err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : String(err),
        code: 'INTERNAL_ERROR',
    });
};
