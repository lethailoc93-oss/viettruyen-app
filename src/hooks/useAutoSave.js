import { useEffect, useRef } from 'react';

// Auto-save hook with debounce — skips the initial mount trigger
export const useAutoSave = (value, callback, delay = 1000) => {
    const timeoutRef = useRef(null);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Skip auto-save on first mount to prevent unnecessary saves
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(value);
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [value, callback, delay]);
};
