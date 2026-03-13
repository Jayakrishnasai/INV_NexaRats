import { useEffect, useRef, useCallback } from 'react';
import { Product, Customer, Transaction } from '../types';
import { api } from '../services/api';

/**
 * NotificationEngine — watches live data and fires browser push + WhatsApp alerts.
 *
 * Reads the user's toggle settings from localStorage key 'nx_notification_settings'.
 * De-duplicates by storing which alert IDs have already been fired in sessionStorage.
 */

interface NotificationEngineProps {
    products: Product[];
    customers: Customer[];
    transactions: Transaction[];
}

// Read notification settings from localStorage
function getSettings(): Record<string, boolean> {
    try {
        const raw = localStorage.getItem('nx_notification_settings');
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

// Track which alerts we've already fired this session (to avoid spamming)
function getFiredAlerts(): string[] {
    try {
        const raw = sessionStorage.getItem('nx_fired_alerts');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function markFired(id: string) {
    const fired = getFiredAlerts();
    if (!fired.includes(id)) {
        fired.push(id);
        sessionStorage.setItem('nx_fired_alerts', JSON.stringify(fired));
    }
}

function alreadyFired(id: string): boolean {
    return getFiredAlerts().includes(id);
}

// Play notification sound
function playSound() {
    try {
        // Try custom sound first, then use Web Audio API as fallback
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
            // Fallback: Web Audio API beep
            try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 800;
                gain.gain.value = 0.15;
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
            } catch { /* silent */ }
        });
    } catch { /* silent */ }
}

// Send browser push notification
function firePush(title: string, body: string, icon?: string) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
        new Notification(title, {
            body,
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: title, // Prevents duplicate notifications with same tag
            silent: false,
        });
    } catch { /* silent */ }
}

// Send WhatsApp alert via the backend API
async function sendWhatsApp(message: string) {
    try {
        // Get connected number from WhatsApp status
        const statusRes = await api.whatsapp.getStatus();
        if (!statusRes?.success || !statusRes?.data?.connected) {
            // Check if it's explicitly ready
            if (statusRes?.data?.status !== 'ready') return;
        }

        const phoneNumber = statusRes?.data?.number || statusRes?.data?.connectionInfo?.phoneNumber;
        if (!phoneNumber) return;

        // Clean the phone number: remove '+' and '@c.us' etc.
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (!cleanPhone || cleanPhone.length < 10) return;

        const now = new Date();
        const formattedTime = now.toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });

        const finalMessage = `${message}\n\n🕒 _${formattedTime}_`;

        await api.whatsapp.send({ to: cleanPhone, type: 'text', content: finalMessage });
    } catch {
        // Don't crash if WhatsApp is not available
    }
}

export function useNotificationEngine({ products, customers, transactions }: NotificationEngineProps) {
    const lastProductsRef = useRef<string>('');
    const lastCustomersRef = useRef<string>('');
    const initialLoadDone = useRef(false);

    const checkAlerts = useCallback(() => {
        // Don't fire on very first load to avoid a flood
        if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            // Build initial state so we don't re-fire for existing issues
            const outOfStock = products.filter(p => Number(p.stock) <= 0);
            const lowStock = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.minStock ?? 5));
            const pending = customers.filter(c => Number(c.pending) > 0);
            // Mark existing alerts as already fired
            if (outOfStock.length > 0) markFired(`oos-${outOfStock.length}`);
            if (lowStock.length > 0) markFired(`ls-${lowStock.length}`);
            if (pending.length > 0) markFired(`pr-${pending.length}`);
            return;
        }

        const settings = getSettings();

        // ─── LOW STOCK ALERTS ───────────────────────────────────────────────
        if (settings.lowStockAlert !== false) {
            const outOfStock = products.filter(p => Number(p.stock) <= 0);
            const lowStock = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.minStock ?? 5));

            // Out of Stock alert
            if (outOfStock.length > 0) {
                const alertId = `oos-${outOfStock.length}`;
                if (!alreadyFired(alertId)) {
                    markFired(alertId);
                    const names = outOfStock.slice(0, 3).map(p => p.name).join(', ');
                    const extra = outOfStock.length > 3 ? ` +${outOfStock.length - 3} more` : '';
                    const title = `⚠️ ${outOfStock.length} product${outOfStock.length > 1 ? 's' : ''} out of stock!`;
                    const body = `${names}${extra}`;

                    if (settings.pushNotifications !== false) firePush(title, body);
                    if (settings.soundEnabled !== false) playSound();
                    if (settings.whatsappNotifications !== false) {
                        sendWhatsApp(`🚨 *NEXA POS Alert*\n\n${title}\n${body}\n\n_Auto-alert from your inventory system_`);
                    }
                }
            }

            // Low Stock alert
            if (lowStock.length > 0) {
                const alertId = `ls-${lowStock.length}`;
                if (!alreadyFired(alertId)) {
                    markFired(alertId);
                    const names = lowStock.slice(0, 3).map(p => `${p.name} (${p.stock})`).join(', ');
                    const extra = lowStock.length > 3 ? ` +${lowStock.length - 3} more` : '';
                    const title = `📦 ${lowStock.length} product${lowStock.length > 1 ? 's' : ''} running low`;
                    const body = `${names}${extra}`;

                    if (settings.pushNotifications !== false) firePush(title, body);
                    if (settings.soundEnabled !== false) playSound();
                    if (settings.whatsappNotifications !== false) {
                        sendWhatsApp(`⚠️ *NEXA POS Alert*\n\n${title}\n${body}\n\n_Auto-alert from your inventory system_`);
                    }
                }
            }
        }

        // ─── PAYMENT REMINDERS ──────────────────────────────────────────────
        if (settings.paymentReminder !== false) {
            const pending = customers.filter(c => Number(c.pending) > 0);
            if (pending.length > 0) {
                const totalPending = pending.reduce((s, c) => s + Number(c.pending), 0);
                const alertId = `pr-${pending.length}`;
                if (!alreadyFired(alertId)) {
                    markFired(alertId);
                    const title = `💰 ₹${totalPending.toLocaleString('en-IN')} pending payments`;
                    const body = `${pending.length} customer${pending.length > 1 ? 's' : ''} have outstanding balances`;

                    if (settings.pushNotifications !== false) firePush(title, body);
                    if (settings.soundEnabled !== false) playSound();
                    if (settings.whatsappNotifications !== false) {
                        const details = pending.slice(0, 5).map(c => `  • ${c.name}: ₹${Number(c.pending).toLocaleString('en-IN')}`).join('\n');
                        sendWhatsApp(`💰 *NEXA POS — Payment Reminder*\n\n${title}\n\n${details}\n\n_Auto-alert from your inventory system_`);
                    }
                }
            }
        }

        // ─── ORDER UPDATES ──────────────────────────────────────────────────
        if (settings.orderUpdates !== false) {
            const todayStr = (() => {
                const n = new Date();
                return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
            })();
            const todayTxns = transactions.filter(t => t.date === todayStr);
            if (todayTxns.length > 0) {
                const alertId = `order-${todayTxns.length}`;
                if (!alreadyFired(alertId)) {
                    markFired(alertId);
                    const todayTotal = todayTxns.reduce((s, t) => s + (Number(t.total) || 0), 0);
                    const title = `🛒 ${todayTxns.length} sale${todayTxns.length > 1 ? 's' : ''} today`;
                    const body = `Total: ₹${todayTotal.toLocaleString('en-IN')}`;

                    if (settings.pushNotifications !== false) firePush(title, body);
                    // Don't play sound for order updates (too frequent)
                }
            }
        }
    }, [products, customers, transactions]);

    useEffect(() => {
        // Only run checks if data has actually changed
        const productsKey = products.map(p => `${p.id}:${p.stock}`).join('|');
        const customersKey = customers.map(c => `${c.id}:${c.pending}`).join('|');

        if (productsKey === lastProductsRef.current && customersKey === lastCustomersRef.current) return;
        lastProductsRef.current = productsKey;
        lastCustomersRef.current = customersKey;

        // Don't fire alerts on empty data
        if (products.length === 0 && customers.length === 0) return;

        checkAlerts();
    }, [products, customers, transactions, checkAlerts]);
}
