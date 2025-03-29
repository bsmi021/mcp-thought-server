/**
 * Enhanced Confidence System Types
 * @description Type definitions for the Enhanced Confidence System (ECS)
 * @version 1.0.0
 */

/**
 * Represents the dimensions used in confidence calculation
 */
export interface ConfidenceDimensions {
    /** Problem analysis confidence (0-1) */
    analytical: number;
    /** Implementation confidence (0-1) */
    implementation: number;
    /** Pattern recognition confidence (0-1) */
    pattern: number;
    /** Context relevance confidence (0-1) */
    context: number;
}

/**
 * Represents the weights used in confidence calculation
 */
export interface ConfidenceWeights {
    /** Analytical weight (default: 0.4) */
    analytical: number;
    /** Implementation weight (default: 0.3) */
    implementation: number;
    /** Pattern weight (default: 0.2) */
    pattern: number;
    /** Context weight (default: 0.1) */
    context: number;
}

/**
 * Represents the stage types in the confidence system
 */
export type StageType = 'initial' | 'critique' | 'revision' | 'final';

/**
 * Represents a stage in the confidence system
 */
export interface Stage {
    /** Type of the stage */
    type: StageType;
    /** Confidence thresholds for the stage */
    thresholds: {
        /** Minimum required confidence */
        min: number;
        /** Target confidence level */
        target: number;
    };
}

/**
 * Represents performance metrics for the confidence system
 */
export interface PerformanceMetrics {
    /** Success rate of confidence calculations */
    successRate: number;
    /** Error rate in confidence calculations */
    errorRate: number;
    /** Average latency of calculations */
    latency: number;
    /** Resource usage metrics */
    resourceUsage: number;
}

/**
 * Context for confidence calculation
 */
export interface CalculationContext {
    /** Session identifier */
    sessionId?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Context for threshold validation
 */
export interface ValidationContext {
    /** Stage-specific context */
    stageContext?: Record<string, unknown>;
    /** Validation metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Context for weight adjustment
 */
export interface AdjustmentContext {
    /** Historical performance data */
    history?: PerformanceMetrics[];
    /** Adjustment metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Response from confidence calculation
 */
export interface ConfidenceResponse {
    /** Final confidence score */
    score: number;
    /** Individual dimension scores */
    dimensions: ConfidenceDimensions;
    /** Weights used in calculation */
    weights: ConfidenceWeights;
    /** Calculation timestamp */
    timestamp: Date;
}

/**
 * Response from threshold validation
 */
export interface ValidationResponse {
    /** Whether the confidence meets thresholds */
    isValid: boolean;
    /** Current stage thresholds */
    thresholds: Stage['thresholds'];
    /** Validation timestamp */
    timestamp: Date;
}

/**
 * Response from weight adjustment
 */
export interface AdjustmentResponse {
    /** Previous weights */
    oldWeights: ConfidenceWeights;
    /** New adjusted weights */
    newWeights: ConfidenceWeights;
    /** Adjustment metrics */
    metrics: PerformanceMetrics;
    /** Adjustment timestamp */
    timestamp: Date;
} 