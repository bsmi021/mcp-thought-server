import { RuntimeDebugControl, DebugFeature, DebugChangeCallback } from '../types/debugControl.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js';

/**
 * Service for managing runtime debug control settings
 * Implements singleton pattern to ensure consistent debug state across the system
 * Provides methods to toggle debug features and subscribe to state changes
 */
export class DebugControlService {
    private static instance: DebugControlService | null = null;
    private static instanceLock = false;
    private changeCallbacks: Set<DebugChangeCallback> = new Set();

    /**
     * Default debug state - all false except metricTracking
     * These defaults are used if no environment variables are set
     */
    private currentState: RuntimeDebugControl = {
        errorCapture: false,
        metricTracking: true,  // Only this defaults to true
        performanceMonitoring: false,
        mcpDebug: false
    };

    private constructor() {
        // Initialize with environment variables if they exist
        // Note: Only true/false strings are valid, anything else keeps the default
        this.currentState = {
            errorCapture: process.env.ENABLE_ERROR_CAPTURE === 'true',
            metricTracking: process.env.ENABLE_METRIC_TRACKING !== 'false',
            performanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
            mcpDebug: process.env.ENABLE_MCP_DEBUG === 'true'
        };

        // Update ConfigurationManager with initial state
        this.updateConfigManager();
    }

    /**
     * Get the singleton instance of DebugControlService
     * Thread-safe implementation using double-checked locking pattern
     */
    public static getInstance(): DebugControlService {
        if (!DebugControlService.instance) {
            if (!DebugControlService.instanceLock) {
                DebugControlService.instanceLock = true;
                try {
                    DebugControlService.instance = new DebugControlService();
                } finally {
                    DebugControlService.instanceLock = false;
                }
            } else {
                while (DebugControlService.instanceLock) {
                    // Busy wait (in practice, you might want to use a proper async wait)
                }
                return DebugControlService.getInstance();
            }
        }
        return DebugControlService.instance;
    }

    /**
     * Get current debug state
     * Returns a copy to prevent direct state mutation
     */
    public getDebugState(): RuntimeDebugControl {
        return { ...this.currentState };
    }

    /**
     * Enable or disable a specific debug feature
     * @param feature - The debug feature to modify
     * @param enabled - Whether to enable or disable the feature
     * @returns The updated debug state
     */
    public setFeature(feature: DebugFeature, enabled: boolean): RuntimeDebugControl {
        this.currentState = {
            ...this.currentState,
            [feature]: enabled
        };
        this.updateConfigManager();
        this.notifySubscribers();
        return this.getDebugState();
    }

    /**
     * Subscribe to debug state changes
     * @param callback - Function to call when state changes
     * @returns Function to unsubscribe
     */
    public subscribe(callback: DebugChangeCallback): () => void {
        this.changeCallbacks.add(callback);
        return () => this.changeCallbacks.delete(callback);
    }

    /**
     * Update ConfigurationManager with current debug state
     * This ensures all services see the same debug configuration
     */
    private updateConfigManager(): void {
        const configManager = ConfigurationManager.getInstance();
        configManager.updateIntegratedConfig({
            debugConfig: this.currentState
        });
    }

    /**
     * Notify all subscribers of state changes
     * Passes a copy of the state to prevent direct mutation
     */
    private notifySubscribers(): void {
        const state = this.getDebugState();
        this.changeCallbacks.forEach(callback => callback(state));
    }
} 