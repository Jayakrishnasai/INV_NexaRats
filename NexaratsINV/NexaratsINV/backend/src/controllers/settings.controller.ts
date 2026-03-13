import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase/client';
import { sendSuccess } from '../utils/response';
import { wrapDatabaseError } from '../utils/errors';

export const getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('settings')
            .select('*');

        if (error) throw wrapDatabaseError(error, 'SettingsController.getSettings');

        const settingsMap: Record<string, any> = {};
        (data || []).forEach(row => {
            settingsMap[row.key] = row.value;
        });

        sendSuccess(res, settingsMap);
    } catch (err) { next(err); }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const updates = req.body; // { key1: value1, key2: value2 }

        for (const [key, value] of Object.entries(updates)) {
            // Upsert each key
            const { error } = await supabaseAdmin
                .from('settings')
                .upsert({ key, value, updated_at: new Date().toISOString() });

            if (error) {
                console.error(`Failed to update setting ${key}:`, error);
                throw wrapDatabaseError(error, 'SettingsController.updateSettings');
            }
        }

        sendSuccess(res, { success: true, updatedKeys: Object.keys(updates) });
    } catch (err) { next(err); }
};
