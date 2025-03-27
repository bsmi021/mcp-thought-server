import { z } from 'zod';
import { CoreConfig } from '../types/index.js';
import { DraftConfig } from '../types/chainOfDraft.js';
import { IntegratedConfig, integratedConfigSchema } from '../types/integrated.js';

/**
 * Centralized configuration management for all services
 * Implements singleton pattern to ensure consistent configuration across the system
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager | null = null;
    private static instanceLock = false;

    private config: {
        integrated: Required<IntegratedConfig>;
        draft: Required<DraftConfig>;
        core: Required<CoreConfig>;
    };

    private constructor() {
        // Initialize with default configurations
        this.config = {
            integrated: {
                draftConfig: {
                    maxDrafts: 10,
                    contextWindow: 16384,
                    confidenceThreshold: 0.6,  // Base confidence threshold
                    enableParallelProcessing: false,
                    revisionEnabled: true
                },
                sequentialConfig: {
                    maxDepth: 12,
                    parallelTasks: true,
                    contextWindow: 163840,
                    branchingEnabled: true,
                    revisionEnabled: true,
                    confidenceThreshold: 0.6  // Base confidence threshold
                },
                enhancementConfig: {
                    enableCrossServiceOptimization: true,
                    enableAdaptiveProcessing: true,
                    enablePerformanceMonitoring: true,
                    enableErrorRecovery: true,
                    enableMetricsCollection: true
                },
                debugConfig: {
                    errorCapture: true,
                    metricTracking: true,
                    performanceMonitoring: true,
                    mcpDebug: false
                },
                mcpConfig: {
                    serverUrl: 'http://localhost:3000',
                    apiKey: 'default-key',
                    maxRetries: 3,
                    timeout: 5000,
                    features: {
                        sequentialThinking: true,
                        draftProcessing: true,
                        parallelProcessing: true,
                        monitoring: true
                    }
                }
            },
            draft: {
                maxDrafts: 10,
                contextWindow: 16384,
                confidenceThreshold: 0.6,  // Base confidence threshold
                enableParallelProcessing: false,
                revisionEnabled: true,
                creativeContentEnabled: true  // Enable creative content by default
            },
            core: {
                maxDepth: 12,
                parallelTasks: true,
                contextWindow: 163840,
                branchingEnabled: true,
                revisionEnabled: true,
                confidenceThreshold: 0.6  // Base confidence threshold
            }
        };
    }

    /**
     * Get the singleton instance of ConfigurationManager
     */
    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            if (!ConfigurationManager.instanceLock) {
                ConfigurationManager.instanceLock = true;
                try {
                    ConfigurationManager.instance = new ConfigurationManager();
                } finally {
                    ConfigurationManager.instanceLock = false;
                }
            } else {
                while (ConfigurationManager.instanceLock) {
                    // Busy wait (in practice, you might want to use a proper async wait)
                }
                return ConfigurationManager.getInstance();
            }
        }
        return ConfigurationManager.instance;
    }

    /**
     * Get integrated service configuration
     */
    public getIntegratedConfig(): Required<IntegratedConfig> {
        return { ...this.config.integrated };
    }

    /**
     * Get draft service configuration
     */
    public getDraftConfig(): Required<DraftConfig> {
        return { ...this.config.draft };
    }

    /**
     * Get core configuration
     */
    public getCoreConfig(): Required<CoreConfig> {
        return { ...this.config.core };
    }

    /**
     * Update integrated configuration with validation
     */
    public updateIntegratedConfig(config: Partial<IntegratedConfig>): void {
        const validated = integratedConfigSchema.parse({
            ...this.config.integrated,
            ...config
        });
        this.config.integrated = validated;
    }

    /**
     * Update draft configuration
     */
    public updateDraftConfig(config: Partial<DraftConfig>): void {
        this.config.draft = {
            ...this.config.draft,
            ...config
        };
    }

    /**
     * Update core configuration
     */
    public updateCoreConfig(config: Partial<CoreConfig>): void {
        this.config.core = {
            ...this.config.core,
            ...config
        };
    }
} 