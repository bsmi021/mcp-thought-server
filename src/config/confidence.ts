/**
 * Enhanced Confidence System Configuration
 * @description Configuration values and constants for the Enhanced Confidence System (ECS)
 * @version 1.0.0
 */

import { ConfidenceWeights, Stage } from '../types/confidence';

/**
 * Default weights for confidence calculation
 */
export const DEFAULT_WEIGHTS: ConfidenceWeights = {
    analytical: 0.4,
    implementation: 0.3,
    pattern: 0.2,
    context: 0.1,
};

/**
 * Stage configurations with their respective thresholds
 */
export const STAGE_CONFIGS: Record<Stage['type'], Stage> = {
    initial: {
        type: 'initial',
        thresholds: {
            min: 0.4,
            target: 0.6,
        },
    },
    critique: {
        type: 'critique',
        thresholds: {
            min: 0.6,
            target: 0.8,
        },
    },
    revision: {
        type: 'revision',
        thresholds: {
            min: 0.7,
            target: 0.85,
        },
    },
    final: {
        type: 'final',
        thresholds: {
            min: 0.9,
            target: 0.95,
        },
    },
};

/**
 * Performance thresholds for monitoring
 */
export const PERFORMANCE_THRESHOLDS = {
    /** Maximum acceptable latency in milliseconds */
    MAX_LATENCY: 200,
    /** Minimum acceptable success rate */
    MIN_SUCCESS_RATE: 0.95,
    /** Maximum acceptable error rate */
    MAX_ERROR_RATE: 0.05,
    /** Maximum acceptable resource usage in bytes */
    MAX_RESOURCE_USAGE: 200 * 1024 * 1024, // 200MB
};

/**
 * Weight adjustment configuration
 */
export const WEIGHT_ADJUSTMENT_CONFIG = {
    /** Minimum weight value allowed */
    MIN_WEIGHT: 0.1,
    /** Maximum weight value allowed */
    MAX_WEIGHT: 0.5,
    /** Maximum weight adjustment per operation */
    MAX_ADJUSTMENT: 0.05,
    /** Minimum interval between adjustments in milliseconds */
    MIN_ADJUSTMENT_INTERVAL: 60000, // 1 minute
};

/**
 * API endpoint configuration
 */
export const API_CONFIG = {
    /** Base path for confidence API endpoints */
    BASE_PATH: '/api/v1/confidence',
    /** Rate limit for API calls (requests per minute) */
    RATE_LIMIT: 100,
    /** Request timeout in milliseconds */
    TIMEOUT: 5000,
};

/**
 * Validation configuration
 */
export const VALIDATION_CONFIG = {
    /** Maximum allowed difference between dimension scores */
    MAX_DIMENSION_VARIANCE: 0.3,
    /** Minimum required data points for weight adjustment */
    MIN_HISTORY_POINTS: 10,
    /** Maximum age of historical data in milliseconds */
    MAX_HISTORY_AGE: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
    INVALID_DIMENSIONS: 'Invalid confidence dimensions provided',
    INVALID_WEIGHTS: 'Invalid confidence weights provided',
    INVALID_STAGE: 'Invalid stage type provided',
    THRESHOLD_NOT_MET: 'Confidence threshold not met for stage',
    WEIGHT_ADJUSTMENT_FAILED: 'Weight adjustment failed',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    INVALID_CONTEXT: 'Invalid context provided',
} as const; 