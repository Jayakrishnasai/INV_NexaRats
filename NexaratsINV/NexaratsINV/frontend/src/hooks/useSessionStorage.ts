import { useState, useEffect } from 'react';

export function useSessionStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        try {
            const saved = sessionStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
            console.error(`[STORAGE] Failed to save key "${key}" — storage may be full:`, err);
        }
    }, [key, value]);

    // Listen to changes from other parts of the app or other tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                try { setValue(JSON.parse(e.newValue)); } catch { }
            }
        };
        const handleCustomEvent = (e: CustomEvent) => {
            if (e.detail?.key === key && e.detail?.newValue) {
                try { setValue(JSON.parse(e.detail.newValue)); } catch { }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('session_storage_update', handleCustomEvent as EventListener);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('session_storage_update', handleCustomEvent as EventListener);
        };
    }, [key]);

    return [value, setValue];
}
