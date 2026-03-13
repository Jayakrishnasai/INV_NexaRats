import { Response } from 'express';

export interface ApiSuccess<T> {
    success: true;
    data: T;
    message?: string;
}

export interface ApiError {
    success: false;
    error: string;
    code: string;
}

export interface ApiPaginated<T> {
    success: true;
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export const sendSuccess = <T>(res: Response, data: T, message?: string, status = 200, meta?: any): Response => {
    const body: ApiSuccess<T> & { meta?: any } = { success: true, data };
    if (message) body.message = message;
    if (meta) body.meta = meta;
    return res.status(status).json(body);
};

export const sendPaginated = <T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number
): Response => {
    const body: ApiPaginated<T> = { success: true, data, total, page, limit };
    return res.status(200).json(body);
};

export const sendError = (res: Response, statusCode: number, message: string, code: string): Response => {
    const body: ApiError = { success: false, error: message, code };
    return res.status(statusCode).json(body);
};
