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
                    /**
                     * Maximum number of drafts allowed in a single chain
                     * Rationale: Prevents infinite loops while allowing sufficient iterations for complex tasks
                     * Default: 10 - Provides balance between thoroughness and resource usage
                     */
                    maxDrafts: 10,

                    /**
                     * Context window size in tokens for draft processing
                     * Rationale: Must be large enough to hold draft content plus metadata
                     * Default: 16384 - Optimized for typical draft lengths while managing memory usage
                     */
                    contextWindow: 16384,

                    /**
                     * Base confidence threshold for accepting a draft
                     * Rationale: Starting point should be moderately strict to ensure quality
                     * Default: 0.85 - Higher than previous 0.6 to prevent premature acceptance
                     * Note: Initial drafts typically need refinement, so we start with a higher bar
                     */
                    confidenceThreshold: 0.85,

                    /**
                     * Minimum confidence increase required between drafts
                     * Rationale: Ensures meaningful improvements between iterations
                     * Default: 0.1 - Higher than previous 0.05 to prevent small, insignificant changes
                     * Note: Smaller improvements may indicate diminishing returns
                     */
                    minConfidenceGrowth: 0.1,

                    /**
                     * Minimum confidence required for revision acceptance
                     * Rationale: Revisions should demonstrate significant improvement
                     * Default: 0.9 - Higher than previous 0.65 to ensure revisions are meaningful
                     * Note: Revisions should be held to a higher standard than initial drafts
                     */
                    minRevisionConfidence: 0.9,

                    /**
                     * Enable parallel processing of drafts
                     * Rationale: Can improve performance but may increase resource usage
                     * Default: false - Sequential processing is more predictable for drafts
                     */
                    enableParallelProcessing: false,

                    /**
                     * Enable revision system
                     * Rationale: Allows refinement of drafts that don't meet confidence thresholds
                     * Default: true - Critical for achieving high-quality outputs
                     */
                    revisionEnabled: true
                },
                sequentialConfig: {
                    /**
                     * Maximum depth of sequential thinking chain
                     * Rationale: Prevents infinite recursion while allowing deep analysis
                     * Default: 12 - Sufficient for most complex problems
                     */
                    maxDepth: 12,

                    /**
                     * Enable parallel processing of compatible thoughts
                     * Rationale: Improves performance for independent thought branches
                     * Default: true - Benefits outweigh overhead for sequential thinking
                     */
                    parallelTasks: true,

                    /**
                     * Context window size for sequential thinking
                     * Rationale: Must accommodate entire thought chain plus context
                     * Default: 163840 - Large enough for complex reasoning chains
                     */
                    contextWindow: 163840,

                    /**
                     * Enable branching in thought processes
                     * Rationale: Allows exploration of multiple solution paths
                     * Default: true - Essential for complex problem solving
                     */
                    branchingEnabled: true,

                    /**
                     * Enable revision of previous thoughts
                     * Rationale: Allows correction of earlier misconceptions
                     * Default: true - Critical for maintaining logical consistency
                     */
                    revisionEnabled: true,

                    /**
                     * Base confidence threshold for accepting a thought
                     * Rationale: Should be higher than draft threshold due to atomic nature
                     * Default: 0.9 - Higher than previous 0.6 to ensure logical rigor
                     * Note: Individual thoughts should be highly confident before proceeding
                     */
                    confidenceThreshold: 0.9,

                    /**
                     * Minimum confidence increase between related thoughts
                     * Rationale: Ensures meaningful progress in reasoning chain
                     * Default: 0.15 - Higher than previous 0.05 to prevent circular reasoning
                     * Note: Larger steps needed for sequential thinking vs drafts
                     */
                    minConfidenceGrowth: 0.15,

                    /**
                     * Minimum confidence for thought revisions
                     * Rationale: Revisions should significantly improve reasoning
                     * Default: 0.95 - Higher than previous 0.65 to ensure valuable corrections
                     * Note: Revisions to logical chains must be extremely confident
                     */
                    minRevisionConfidence: 0.95
                },
                enhancementConfig: {
                    enableCrossServiceOptimization: true,
                    enableAdaptiveProcessing: true,
                    enablePerformanceMonitoring: true,
                    enableErrorRecovery: true,
                    enableMetricsCollection: true
                },
                debugConfig: {
                    errorCapture: false,
                    metricTracking: true,
                    performanceMonitoring: false,
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
                /**
                 * Draft service specific configurations
                 * These mirror the integrated.draftConfig settings
                 * See above documentation for detailed explanations
                 */
                maxDrafts: 10,
                contextWindow: 16384,
                confidenceThreshold: 0.85,
                minConfidenceGrowth: 0.1,
                minRevisionConfidence: 0.9,
                enableParallelProcessing: false,
                revisionEnabled: true,
                creativeContentEnabled: true
            },
            core: {
                /**
                 * Core service specific configurations
                 * These mirror the integrated.sequentialConfig settings
                 * See above documentation for detailed explanations
                 */
                maxDepth: 12,
                parallelTasks: true,
                contextWindow: 163840,
                branchingEnabled: true,
                revisionEnabled: true,
                confidenceThreshold: 0.9,
                minConfidenceGrowth: 0.15,
                minRevisionConfidence: 0.95
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