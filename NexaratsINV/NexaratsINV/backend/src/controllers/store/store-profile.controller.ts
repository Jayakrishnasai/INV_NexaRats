import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../supabase/client';
import { sendSuccess } from '../../utils/response';
import { NotFoundError, AuthError, wrapDatabaseError } from '../../utils/errors';

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        const { data, error } = await supabaseAdmin
            .from('customers')
            .update({ ...req.body, updated_at: new Date().toISOString() })
            .eq('id', req.storeCustomer.id)
            .select('id, name, phone, email')
            .single();

        if (error || !data) throw new NotFoundError('Customer');
        sendSuccess(res, data, 'Profile updated');
    } catch (err) { next(err); }
};

export const addAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        // If new address is default, unset any existing defaults
        if (req.body.isDefault) {
            await supabaseAdmin
                .from('store_addresses')
                .update({ is_default: false })
                .eq('customer_id', req.storeCustomer.id);
        }

        const { data, error } = await supabaseAdmin
            .from('store_addresses')
            .insert({
                customer_id: req.storeCustomer.id,
                label: req.body.label,
                name: req.body.name,
                phone: req.body.phone,
                line1: req.body.line1,
                line2: req.body.line2 || null,
                city: req.body.city,
                state: req.body.state,
                pincode: req.body.pincode,
                is_default: req.body.isDefault ?? false,
            })
            .select('*')
            .single();

        if (error) throw wrapDatabaseError(error, 'StoreProfile.addAddress');
        sendSuccess(res, data, 'Address added', 201);
    } catch (err) { next(err); }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        if (req.body.isDefault) {
            await supabaseAdmin
                .from('store_addresses')
                .update({ is_default: false })
                .eq('customer_id', req.storeCustomer.id);
        }

        const { data, error } = await supabaseAdmin
            .from('store_addresses')
            .update({ ...req.body, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('customer_id', req.storeCustomer.id)
            .select('*')
            .single();

        if (error || !data) throw new NotFoundError('Address');
        sendSuccess(res, data, 'Address updated');
    } catch (err) { next(err); }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.storeCustomer) throw new AuthError('Store authentication required');

        const { error } = await supabaseAdmin
            .from('store_addresses')
            .delete()
            .eq('id', req.params.id)
            .eq('customer_id', req.storeCustomer.id);

        if (error) throw new NotFoundError('Address');
        sendSuccess(res, null, 'Address deleted');
    } catch (err) { next(err); }
};
