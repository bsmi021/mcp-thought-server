import { z } from 'zod';
import { DraftConfig, EnhancementConfig as DraftEnhancementConfig, DebugConfig as DraftDebugConfig } from './chainOfDraft';
import { CoreConfig, EnhancementConfig as SequentialEnhancementConfig, DebugConfig as SequentialDebugConfig } from './index';
import { DraftData } from './chainOfDraft';
import { SequentialThoughtData } from './index';

/**
 * Configuration for the integrated thinking service
 */
export interface IntegratedConfig {
    draftConfig: Partial<DraftConfig>;
    sequentialConfig: Partial<CoreConfig>;
    enhancementConfig: Partial<IntegratedEnhancementConfig>;
    debugConfig: Partial<IntegratedDebugConfig>;
    mcpConfig: MCPConfig;
    verboseConfig: VerboseConfig;
}

/**
 * Configuration for controlling verbose output
 */
export interface VerboseConfig {
    // Core output controls
    showProcessingMetrics: boolean;      // Show processing time and resource usage
    showServiceMetrics: boolean;         // Show service-specific metrics
    showMcpMetrics: boolean;            // Show MCP integration metrics

    // Detailed output controls
    showAdaptationHistory: boolean;     // Show adaptation history in response
    showCategoryHistory: boolean;       // Show category transition history
    showDependencyChain: boolean;       // Show thought/draft dependencies
    showDebugMetrics: boolean;          // Show detailed debug metrics

    // Performance monitoring
    showMemoryUsage: boolean;           // Show memory usage statistics
    showParallelTaskInfo: boolean;      // Show parallel processing information

    // Default to true for backward compatibility
    showFullResponse: boolean;          // Show complete response (overrides other settings if true)
}

/**
 * MCP-specific configuration
 */
export interface MCPConfig {
    serverUrl: string;
    apiKey: string;
    maxRetries: number;
    timeout: number;
    features: {
        sequentialThinking: boolean;
        draftProcessing: boolean;
        parallelProcessing: boolean;
        monitoring: boolean;
    };
}

/**
 * Enhancement configuration for the integrated service
 */
export interface IntegratedEnhancementConfig {
    enableCrossServiceOptimization: boolean;
    enableAdaptiveProcessing: boolean;
    enablePerformanceMonitoring: boolean;
    enableErrorRecovery: boolean;
    enableMetricsCollection: boolean;
}

/**
 * Debug configuration for the integrated service
 */
export interface IntegratedDebugConfig {
    errorCapture: boolean;
    metricTracking: boolean;
    performanceMonitoring: boolean;
    mcpDebug: boolean;
}

/**
 * Metrics for the integrated service
 */
export interface IntegratedMetrics {
    startTime: number;
    processingTimes: number[];
    successRate: number;
    mcpIntegrationMetrics: {
        calls: number;
        failures: number;
        averageLatency: number;
        lastError?: string;
    };
    serviceMetrics: {
        sequential: {
            totalThoughts: number;
            averageProcessingTime: number;
            successRate: number;
            lastConfidence?: number;
            lastCategory?: 'initial' | 'critique' | 'revision' | 'final';
            categoryHistory: Array<{
                category: 'initial' | 'critique' | 'revision' | 'final';
                confidence: number;
                timestamp: number;
            }>;
        };
        draft: {
            totalDrafts: number;
            averageProcessingTime: number;
            successRate: number;
            lastConfidence?: number;
        };
    };
}

/**
 * Result of integrated processing
 */
export interface IntegratedResult {
    sequentialOutput: SequentialThoughtData;
    draftOutput: DraftData;
    mcpEnhancements: MCPEnhancements;
    metrics: IntegratedMetrics;
    category: {
        type: 'initial' | 'critique' | 'revision' | 'final';
        confidence: number;
        metadata?: Record<string, unknown>;
    };
    context: {
        problemScope?: string;
        assumptions?: string[];
        constraints?: string[];
    };
    mcpFeatures: {
        sequentialThinking?: boolean;
        draftProcessing?: boolean;
        parallelProcessing?: boolean;
        monitoring?: boolean;
    };
}

/**
 * MCP-specific enhancements
 */
export interface MCPEnhancements {
    contextWindow: number;
    confidence: number;
    suggestions: string[];
    optimizations: {
        type: string;
        description: string;
        impact: number;
    }[];
}

/**
 * Processing state for the integrated service
 */
export interface IntegratedProcessingState {
    currentPhase: 'initialization' | 'processing' | 'completion' | 'error';
    currentCategory: 'initial' | 'critique' | 'revision' | 'final';
    currentConfidence: number;
    activeThreads: number;
    pendingOperations: string[];
    completedSteps: number;
    estimatedRemainingSteps: number;
    minRequiredThoughts: number;
    adaptationHistory: Array<{
        timestamp: number;
        adjustment: string;
        reason: string;
    }>;
    categoryHistory: Array<{
        category: 'initial' | 'critique' | 'revision' | 'final';
        confidence: number;
        timestamp: number;
    }>;
}

// Zod schemas for runtime validation
export const integratedConfigSchema = z.object({
    draftConfig: z.object({
        maxDrafts: z.number().min(1).optional(),
        contextWindow: z.number().min(1).optional(),
        confidenceThreshold: z.number().min(0).max(1).optional(),
        enableParallelProcessing: z.boolean().optional(),
        revisionEnabled: z.boolean().optional()
    }),
    sequentialConfig: z.object({
        maxDepth: z.number().min(1).optional(),
        parallelTasks: z.boolean().optional(),
        contextWindow: z.number().min(1).optional(),
        branchingEnabled: z.boolean().optional(),
        revisionEnabled: z.boolean().optional(),
        confidenceThreshold: z.number().min(0).max(1).optional(),
        // Added new optional fields to match CoreConfig
        embeddingModel: z.string().optional(),
        includePreviousStepTextInContext: z.boolean().optional()
    }),
    enhancementConfig: z.object({
        enableCrossServiceOptimization: z.boolean().optional(),
        enableAdaptiveProcessing: z.boolean().optional(),
        enablePerformanceMonitoring: z.boolean().optional(),
        enableErrorRecovery: z.boolean().optional(),
        enableMetricsCollection: z.boolean().optional()
    }),
    debugConfig: z.object({
        errorCapture: z.boolean().optional(),
        metricTracking: z.boolean().optional(),
        performanceMonitoring: z.boolean().optional(),
        mcpDebug: z.boolean().optional()
    }),
    mcpConfig: z.object({
        serverUrl: z.string().url(),
        apiKey: z.string().min(1),
        maxRetries: z.number().min(1),
        timeout: z.number().min(1000),
        features: z.object({
            sequentialThinking: z.boolean(),
            draftProcessing: z.boolean(),
            parallelProcessing: z.boolean(),
            monitoring: z.boolean()
        })
    }),
    verboseConfig: z.object({
        showProcessingMetrics: z.boolean(),
        showServiceMetrics: z.boolean(),
        showMcpMetrics: z.boolean(),
        showAdaptationHistory: z.boolean(),
        showCategoryHistory: z.boolean(),
        showDependencyChain: z.boolean(),
        showDebugMetrics: z.boolean(),
        showMemoryUsage: z.boolean(),
        showParallelTaskInfo: z.boolean(),
        showFullResponse: z.boolean()
    })
});

export const integratedResultSchema = z.object({
    sequentialOutput: z.any(), // Using any for now as we'll import the actual schema
    draftOutput: z.any(), // Using any for now as we'll import the actual schema
    mcpEnhancements: z.object({
        contextWindow: z.number().min(1),
        confidence: z.number().min(0).max(1),
        suggestions: z.array(z.string()),
        optimizations: z.array(z.object({
            type: z.string(),
            description: z.string(),
            impact: z.number().min(0).max(1)
        }))
    }),
    metrics: z.object({
        startTime: z.number(),
        processingTimes: z.array(z.number()),
        successRate: z.number().min(0).max(1),
        mcpIntegrationMetrics: z.object({
            calls: z.number(),
            failures: z.number(),
            averageLatency: z.number(),
            lastError: z.string().optional()
        }),
        serviceMetrics: z.object({
            sequential: z.object({
                totalThoughts: z.number(),
                averageProcessingTime: z.number(),
                successRate: z.number()
            }),
            draft: z.object({
                totalDrafts: z.number(),
                averageProcessingTime: z.number(),
                successRate: z.number()
            })
        })
    })
});
