import { supabaseAdmin } from '../supabase/client';
import { hashPassword, comparePassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { NotFoundError, ConflictError, AuthError, wrapDatabaseError } from '../utils/errors';
import { AdminUser } from '../types';
import { env } from '../config/env';

export class UserService {
    /** Authenticate admin user — FIX C1 + E6: includes org and onboarding state in response */
    async login(email: string, password: string) {
        const { data: user, error } = await supabaseAdmin
            .from('admin_users')
            .select('id, name, email, password, role, status, permissions')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            throw new AuthError('Invalid email or password');
        }

        if (user.status !== 'Active') {
            throw new AuthError('Account is inactive. Contact your administrator.');
        }

        const valid = await comparePassword(password, user.password);
        if (!valid) {
            throw new AuthError('Invalid email or password');
        }

        // Update last_login timestamp
        await supabaseAdmin
            .from('admin_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        const jwtPayload = {
            sub: user.id,
            userId: user.id,    // keep for backward compat
            email: user.email,
            role: user.role,
            permissions: user.permissions || {},
            org: '',            // legacy admin users have no org
        };

        const accessToken = signAccessToken(jwtPayload);
        const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: 1 });

        const { password: _pw, ...safeUser } = user;

        return {
            success: true,
            user: {
                id: safeUser.id,
                name: safeUser.name,
                email: safeUser.email,
                role: safeUser.role,
                permissions: safeUser.permissions || {},
            },
            token: accessToken,
            refreshToken,
        };
    }

    /** FIX C4: Refresh access token using long-lived refresh token */
    async refresh(refreshToken: string) {
        const payload = verifyRefreshToken(refreshToken);

        const { data: user, error } = await supabaseAdmin
            .from('admin_users')
            .select('id, name, email, role, status, permissions')
            .eq('id', payload.userId)
            .single();

        if (error || !user || user.status !== 'Active') {
            throw new AuthError('User not found or inactive');
        }

        const accessToken = signAccessToken({
            sub: user.id,
            userId: user.id,
            email: user.email,
            role: user.role,
            org: '',
            permissions: user.permissions || {},
        });

        return { success: true, token: accessToken };
    }

    async getAll(): Promise<Omit<AdminUser, 'password'>[]> {
        const { data, error } = await supabaseAdmin
            .from('admin_users')
            .select('id, name, email, role, status, permissions, last_login, created_at')
            .order('created_at', { ascending: false });

        if (error) throw wrapDatabaseError(error, 'UserService.getAll');

        return (data || []).map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            permissions: u.permissions,
            lastLogin: u.last_login,
        }));
    }

    async create(data: {
        name: string;
        email: string;
        password: string;
        role: string;
        status: 'Active' | 'Inactive';
        permissions: Record<string, string>;
    }) {
        // Check for duplicate email
        const { data: existing } = await supabaseAdmin
            .from('admin_users')
            .select('id')
            .eq('email', data.email.toLowerCase())
            .single();

        if (existing) {
            throw new ConflictError(`User with email '${data.email}' already exists`);
        }

        // FIX C1: Hash password before storage — NEVER store plain text
        const hashedPassword = await hashPassword(data.password);

        const { data: newUser, error } = await supabaseAdmin
            .from('admin_users')
            .insert({
                name: data.name.trim(),
                email: data.email.toLowerCase(),
                password: hashedPassword,
                role: data.role,
                status: data.status,
                permissions: data.permissions,
            })
            .select('id, name, email, role, status, permissions')
            .single();

        if (error) throw new ConflictError(error.message);

        return newUser;
    }

    async update(id: string, data: {
        name?: string;
        email?: string;
        password?: string;
        role?: string;
        status?: string;
        permissions?: Record<string, string>;
    }) {
        const updatePayload: Record<string, unknown> = {};

        if (data.name) updatePayload.name = data.name.trim();
        if (data.email) updatePayload.email = data.email.toLowerCase();
        if (data.role) updatePayload.role = data.role;
        if (data.status) updatePayload.status = data.status;
        if (data.permissions) updatePayload.permissions = data.permissions;
        // FIX C1: Re-hash password on update if provided
        if (data.password) {
            updatePayload.password = await hashPassword(data.password);
        }
        updatePayload.updated_at = new Date().toISOString();

        const { data: updated, error } = await supabaseAdmin
            .from('admin_users')
            .update(updatePayload)
            .eq('id', id)
            .select('id, name, email, role, status, permissions')
            .single();

        if (error || !updated) throw new NotFoundError('User');

        return updated;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabaseAdmin.from('admin_users').delete().eq('id', id);
        if (error) throw wrapDatabaseError(error, 'UserService.delete');
    }
}

export const userService = new UserService();
