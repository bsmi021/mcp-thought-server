// Simple logging utility
export const logger = {
    debug: (message: string, ...args: any[]) => {
        console.error(`[DEBUG] ${message}`, ...args);
    },
    info: (message: string, ...args: any[]) => {
        console.error(`[INFO] ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
        console.error(`[WARN] ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
        console.error(`[ERROR] ${message}`, ...args);
    }
};
