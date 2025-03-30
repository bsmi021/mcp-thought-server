import { z } from 'zod';
import { CoreConfig } from '../types/index.js';
import { DraftConfig } from '../types/chainOfDraft.js';
import { IntegratedConfig, integratedConfigSchema, VerboseConfig } from '../types/integrated.js';

/**
 * Configuration manager for the MCP Thought Server
 * Handles loading and validation of configuration from various sources
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager;
    private config: {
        integrated: Required<IntegratedConfig>;
        draft: Required<DraftConfig>;
        core: Required<CoreConfig>;
    };

    private constructor() {
        const integratedConfig = this.loadConfiguration();
        this.config = {
            integrated: integratedConfig,
            draft: integratedConfig.draftConfig as Required<DraftConfig>,
            core: integratedConfig.sequentialConfig as Required<CoreConfig>
        };
    }

    /**
     * Get the singleton instance of ConfigurationManager
     */
    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
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
        // Ensure verboseConfig is always defined by merging with current config
        const configWithVerbose = {
            ...config,
            verboseConfig: {
                ...this.config.integrated.verboseConfig,
                ...(config.verboseConfig || {})
            }
        };

        const validated = integratedConfigSchema.parse({
            ...this.config.integrated,
            ...configWithVerbose
        });

        // Cast is safe because we've ensured verboseConfig is defined
        this.config.integrated = validated as Required<IntegratedConfig>;
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

    /**
     * Get default configuration values
     */
    private getDefaultConfig(): Required<IntegratedConfig> {
        return {
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
                 * Default: 0.7 - Higher than previous 0.6 to prevent premature acceptance
                 * Note: Initial drafts typically need refinement, so we start with a higher bar
                 */
                confidenceThreshold: 0.7,

                /**
                 * Minimum confidence increase required between drafts
                 * Rationale: Ensures meaningful improvements between iterations
                 * Default: 0.05 - Higher than previous 0.05 to prevent small, insignificant changes
                 * Note: Smaller improvements may indicate diminishing returns
                 */
                minConfidenceGrowth: 0.05,

                /**
                 * Minimum confidence required for revision acceptance
                 * Rationale: Revisions should demonstrate significant improvement
                 * Default: 0.65 - Higher than previous 0.65 to ensure revisions are meaningful
                 * Note: Revisions should be held to a higher standard than initial drafts
                 */
                minRevisionConfidence: 0.65,

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
                 * Default: false - Sequential thinking is more predictable
                 */
                parallelTasks: false,

                /**
                 * Context window size for sequential thinking
                 * Rationale: Must accommodate entire thought chain plus context
                 * Default: 16384 - Large enough for complex reasoning chains
                 */
                contextWindow: 16384,

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
                 * Default: 0.7 - Higher than previous 0.6 to ensure logical rigor
                 * Note: Individual thoughts should be highly confident before proceeding
                 */
                confidenceThreshold: 0.7,

                /**
                 * Minimum confidence increase between related thoughts
                 * Rationale: Ensures meaningful progress in reasoning chain
                 * Default: 0.05 - Higher than previous 0.05 to prevent circular reasoning
                 * Note: Larger steps needed for sequential thinking vs drafts
                 */
                minConfidenceGrowth: 0.05,

                /**
                 * Minimum confidence for thought revisions
                 * Rationale: Revisions should significantly improve reasoning
                 * Default: 0.65 - Higher than previous 0.65 to ensure valuable corrections
                 * Note: Revisions to logical chains must be extremely confident
                 */
                minRevisionConfidence: 0.65,
                /**
                 * Default sentence transformer model for semantic relevance checks.
                 */
                embeddingModel: 'Xenova/all-MiniLM-L6-v2',
                /**
                 * Whether to include previous step's text in context relevance calculation.
                 */
                includePreviousStepTextInContext: false,
                /**
                 * Whether the optional LLM coherence check is enabled (determined by env vars).
                 * Default is false. Will be overridden in loadConfiguration if env vars are set.
                 */
                enableLLMCoherenceCheck: false
            } as Partial<CoreConfig>, // Explicit Cast Added
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
                serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000',
                apiKey: process.env.MCP_API_KEY || 'default-key',
                maxRetries: 3,
                timeout: 30000,
                features: {
                    sequentialThinking: true,
                    draftProcessing: true,
                    parallelProcessing: false,
                    monitoring: true
                }
            },
            verboseConfig: {
                showProcessingMetrics: true,
                showServiceMetrics: true,
                showMcpMetrics: true,
                showAdaptationHistory: false,
                showCategoryHistory: false,
                showDependencyChain: false,
                showDebugMetrics: false,
                showMemoryUsage: false,
                showParallelTaskInfo: false,
                showFullResponse: true
            }
        };
    }

    /**
     * Load configuration from environment variables and defaults
     */
    private loadConfiguration(): Required<IntegratedConfig> {
        const defaultConfig = this.getDefaultConfig();

        // Load verbose configuration from environment variables
        const verboseConfig: VerboseConfig = {
            // Core output controls
            showProcessingMetrics: this.getBooleanEnv('MCP_SHOW_PROCESSING_METRICS', defaultConfig.verboseConfig.showProcessingMetrics),
            showServiceMetrics: this.getBooleanEnv('MCP_SHOW_SERVICE_METRICS', defaultConfig.verboseConfig.showServiceMetrics),
            showMcpMetrics: this.getBooleanEnv('MCP_SHOW_MCP_METRICS', defaultConfig.verboseConfig.showMcpMetrics),

            // Detailed output controls
            showAdaptationHistory: this.getBooleanEnv('MCP_SHOW_ADAPTATION_HISTORY', defaultConfig.verboseConfig.showAdaptationHistory),
            showCategoryHistory: this.getBooleanEnv('MCP_SHOW_CATEGORY_HISTORY', defaultConfig.verboseConfig.showCategoryHistory),
            showDependencyChain: this.getBooleanEnv('MCP_SHOW_DEPENDENCY_CHAIN', defaultConfig.verboseConfig.showDependencyChain),
            showDebugMetrics: this.getBooleanEnv('MCP_SHOW_DEBUG_METRICS', defaultConfig.verboseConfig.showDebugMetrics),

            // Performance monitoring
            showMemoryUsage: this.getBooleanEnv('MCP_SHOW_MEMORY_USAGE', defaultConfig.verboseConfig.showMemoryUsage),
            showParallelTaskInfo: this.getBooleanEnv('MCP_SHOW_PARALLEL_TASK_INFO', defaultConfig.verboseConfig.showParallelTaskInfo),

            // Backward compatibility
            showFullResponse: this.getBooleanEnv('MCP_SHOW_FULL_RESPONSE', defaultConfig.verboseConfig.showFullResponse)
        };

        // Determine if LLM coherence check should be enabled based on env vars
        const coherenceApiKey = process.env['COHERENCE_API_KEY'];
        const coherenceModel = process.env['COHERENCE_CHECK_MODEL'];
        const enableLLMCoherenceCheck = !!(coherenceApiKey && coherenceModel); // Enable only if both key and model are set

        // Create the final config, overriding the default flag if needed
        const finalConfig = {
            ...defaultConfig,
            sequentialConfig: {
                ...defaultConfig.sequentialConfig,
                enableLLMCoherenceCheck: enableLLMCoherenceCheck
            },
            verboseConfig
        };

        return finalConfig;
    }

    /**
     * Helper method to get boolean from environment variable
     */
    private getBooleanEnv(key: string, defaultValue: boolean): boolean {
        const value = process.env[key];
        if (value === undefined) return defaultValue;
        return value.toLowerCase() === 'true';
    }
}
