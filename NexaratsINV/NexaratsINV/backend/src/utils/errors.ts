// ─── Typed Error Classes ───────────────────────────────────────────────────────
// These propagate through the service layer and are caught by the error handler.

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    public readonly errors: Record<string, string[]>;
    constructor(message: string, errors: Record<string, string[]> = {}) {
        super(message, 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

export class AuthError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT');
    }
}

export class UnprocessableError extends AppError {
    constructor(message: string) {
        super(message, 422, 'UNPROCESSABLE');
    }
}

export class DatabaseError extends AppError {
    constructor(message: string, public readonly context?: string) {
        super(
            context ? `[${context}] ${message}` : message,
            503,
            'DATABASE_ERROR'
        );
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(service: string, message?: string) {
        super(
            message || `${service} is temporarily unavailable`,
            503,
            'SERVICE_UNAVAILABLE'
        );
    }
}

/**
 * Convert a raw Supabase error into a typed DatabaseError.
 * Use in service layers: `if (error) throw wrapDatabaseError(error, 'ProductService.getAll');`
 */
export const wrapDatabaseError = (
    error: { message: string; code?: string; details?: string } | string,
    context?: string
): DatabaseError => {
    const message = typeof error === 'string' ? error : error.message;
    return new DatabaseError(message, context);
};

