import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/response';

export const getUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await userService.getAll()); } catch (err) { next(err); }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await userService.create(req.body), 'User created', 201); } catch (err) { next(err); }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await userService.update(req.params.id, req.body), 'User updated'); } catch (err) { next(err); }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await userService.delete(req.params.id); sendSuccess(res, null, 'User deleted'); } catch (err) { next(err); }
};
