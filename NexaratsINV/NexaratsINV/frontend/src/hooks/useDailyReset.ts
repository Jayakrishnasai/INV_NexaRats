import { useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { generateMasterCSV, triggerDownload } from '../utils/export';
import { Product, Customer, Vendor, Transaction, PurchaseOrder } from '../types';

const RESET_DATE_KEY = 'nx_last_reset_date';
const EOD_TRIGGERED_KEY = 'nx_eod_triggered_date';

interface DailyResetProps {
    loadData: () => Promise<void>;
    products: Product[];
    customers: Customer[];
    vendors: Vendor[];
    transactions: Transaction[];
    setCustomers: (c: Customer[]) => void;
    setVendors: (v: Vendor[]) => void;
    setTransactions: (t: Transaction[]) => void;
    setPurchases: (p: PurchaseOrder[]) => void;
}

/**
 * useDailyReset
 *
 * This hook manages the frontend daily data lifecycle:
 * 1. Detects when a new day has started (compares stored date with today)
 * 2. Calls loadData() to re-sync frontend state from backend on day change
 * 3. At 23:59 each day, triggers analytics backup on the backend
 * 4. Triggers automatic frontend Master Report download at 23:59
 * 5. Clears frontend state (except inventory) after EOD download to show clean slate
 */
export function useDailyReset({
    loadData,
    products,
    customers,
    vendors,
    transactions,
    setCustomers,
    setVendors,
    setTransactions,
    setPurchases
}: DailyResetProps) {
    const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const eodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const getTodayStr = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };

    const triggerAnalyticsExport = useCallback(async () => {
        const todayStr = getTodayStr();
        const alreadyTriggered = localStorage.getItem(EOD_TRIGGERED_KEY);

        if (alreadyTriggered === todayStr) {
            console.log('[DailyReset] Analytics export already triggered today, skipping.');
            return;
        }

        try {
            console.log('[DailyReset] 🕛 Triggering EOD Master Report & Backup...');
            
            // 1. Frontend Auto-Download
            const csv = generateMasterCSV(products, customers, vendors, transactions, `DAILY_AUTO_${todayStr}`);
            triggerDownload(csv, `NEXA_AUTO_EOD_REPORT_${todayStr}.csv`);
            console.log('[DailyReset] 📥 Master Report auto-download triggered.');

            // 2. Backend Cloud Backup
            const isMock = String(import.meta.env.VITE_USE_MOCKS).trim() === 'true';
            if (!isMock) {
                await api.analytics.triggerExport();
                console.log('[DailyReset] ☁️ Cloud analytics backup completed.');
            }

            // 3. Frontend "Clear" - Only affects local state view until next refresh/day
            // As requested: clear everything except inventory (products)
            setCustomers([]);
            setVendors([]);
            setTransactions([]);
            setPurchases([]);
            console.log('[DailyReset] 🧹 Frontend view cleared (Inventory preserved).');

            localStorage.setItem(EOD_TRIGGERED_KEY, todayStr);
        } catch (err) {
            console.error('[DailyReset] EOD sync/download failed (non-critical):', err);
        }
    }, [products, customers, vendors, transactions, setCustomers, setVendors, setTransactions, setPurchases]);

    const scheduleEodTimer = useCallback(() => {
        if (eodTimerRef.current) clearTimeout(eodTimerRef.current);

        const now = new Date();
        const eod = new Date(now);
        // Trigger at 23:59:00
        eod.setHours(23, 59, 0, 0);

        let msUntilEod = eod.getTime() - now.getTime();
        
        // If it's already past 23:59:00 today, don't schedule for today
        if (msUntilEod <= 0) {
            console.log('[DailyReset] Already past EOD threshold for today.');
            return;
        }

        console.log(`[DailyReset] EOD analytics export scheduled in ${Math.round(msUntilEod / 60000)} minutes`);

        eodTimerRef.current = setTimeout(async () => {
            await triggerAnalyticsExport();
        }, msUntilEod);
    }, [triggerAnalyticsExport]);

    useEffect(() => {
        const lastReset = localStorage.getItem(RESET_DATE_KEY);
        const todayStr = getTodayStr();

        // Day has changed — re-fetch data to show fresh state (backend still has all history)
        if (lastReset && lastReset !== todayStr) {
            console.log(`[DailyReset] 🌅 New day detected (${lastReset} → ${todayStr}). Refreshing data...`);
            loadData().then(() => {
                console.log('[DailyReset] Data refreshed for new day.');
            });
        }

        // Store today so we can detect the next rollover
        localStorage.setItem(RESET_DATE_KEY, todayStr);

        // Schedule EOD analytics export at 23:59
        scheduleEodTimer();

        // Check every minute if the day has rolled over (handles browser left open overnight)
        checkIntervalRef.current = setInterval(() => {
            const currentDay = getTodayStr();
            const storedDay = localStorage.getItem(RESET_DATE_KEY);

            if (storedDay && storedDay !== currentDay) {
                console.log(`[DailyReset] 🌅 Day rolled over (${storedDay} → ${currentDay}). Refreshing...`);
                localStorage.setItem(RESET_DATE_KEY, currentDay);
                loadData();
                scheduleEodTimer(); // Reschedule for the new day
            }
        }, 60_000); // Check every 60 seconds

        return () => {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            if (eodTimerRef.current) clearTimeout(eodTimerRef.current);
        };
    }, [loadData, scheduleEodTimer]);
}
