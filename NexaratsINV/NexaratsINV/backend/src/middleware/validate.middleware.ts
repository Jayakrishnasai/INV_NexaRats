import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

type Target = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory.
 * Applies a Zod schema against the specified part of the request.
 * On failure, throws a ValidationError with field-level details.
 */
export const validate = (schema: ZodSchema, target: Target = 'body') => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            const fieldErrors = (result.error as ZodError).flatten().fieldErrors as Record<string, string[]>;
            return next(new ValidationError('Validation failed', fieldErrors));
        }
        // Replace the target with parsed/coerced data
        (req as any)[target] = result.data;
        next();
    };
};
