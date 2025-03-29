/**
 * Enhanced Confidence System Utilities
 * @description Utility functions for the Enhanced Confidence System (ECS)
 * @version 1.0.0
 */

import {
    ConfidenceDimensions,
    ConfidenceWeights,
    Stage,
    PerformanceMetrics,
} from '../types/confidence';
import {
    DEFAULT_WEIGHTS,
    STAGE_CONFIGS,
    VALIDATION_CONFIG,
    WEIGHT_ADJUSTMENT_CONFIG,
} from '../config/confidence';

/**
 * Validates confidence dimensions
 * @param dimensions Confidence dimensions to validate
 * @returns True if dimensions are valid, false otherwise
 */
export function validateDimensions(dimensions: ConfidenceDimensions): boolean {
    const dimensionValues = Object.values(dimensions);
    return dimensionValues.every(value =>
        typeof value === 'number' &&
        value >= 0 &&
        value <= 1
    );
}

/**
 * Validates confidence weights
 * @param weights Confidence weights to validate
 * @returns True if weights are valid, false otherwise
 */
export function validateWeights(weights: ConfidenceWeights): boolean {
    const weightValues = Object.values(weights);
    const sum = weightValues.reduce((acc, val) => acc + val, 0);

    return weightValues.every(value =>
        typeof value === 'number' &&
        value >= WEIGHT_ADJUSTMENT_CONFIG.MIN_WEIGHT &&
        value <= WEIGHT_ADJUSTMENT_CONFIG.MAX_WEIGHT
    ) && Math.abs(sum - 1) < 0.0001; // Allow for floating point imprecision
}

/**
 * Calculates confidence score from dimensions and weights
 * @param dimensions Confidence dimensions
 * @param weights Optional confidence weights (uses default if not provided)
 * @returns Calculated confidence score
 */
export function calculateConfidence(
    dimensions: ConfidenceDimensions,
    weights: ConfidenceWeights = DEFAULT_WEIGHTS
): number {
    if (!validateDimensions(dimensions) || !validateWeights(weights)) {
        throw new Error('Invalid dimensions or weights provided');
    }

    return Math.min(0.95,
        dimensions.analytical * weights.analytical +
        dimensions.implementation * weights.implementation +
        dimensions.pattern * weights.pattern +
        dimensions.context * weights.context
    );
}

/**
 * Validates if a confidence score meets stage thresholds
 * @param stage Stage to validate against
 * @param confidence Confidence score to validate
 * @returns True if confidence meets thresholds, false otherwise
 */
export function validateStageThresholds(stage: Stage['type'], confidence: number): boolean {
    const stageConfig = STAGE_CONFIGS[stage];
    if (!stageConfig) {
        throw new Error('Invalid stage type provided');
    }

    return confidence >= stageConfig.thresholds.min;
}

/**
 * Calculates dimension variance
 * @param dimensions Confidence dimensions
 * @returns Variance between highest and lowest dimension scores
 */
export function calculateDimensionVariance(dimensions: ConfidenceDimensions): number {
    const values = Object.values(dimensions);
    const max = Math.max(...values);
    const min = Math.min(...values);
    return max - min;
}

/**
 * Validates dimension variance
 * @param dimensions Confidence dimensions
 * @returns True if variance is within acceptable range, false otherwise
 */
export function validateDimensionVariance(dimensions: ConfidenceDimensions): boolean {
    return calculateDimensionVariance(dimensions) <= VALIDATION_CONFIG.MAX_DIMENSION_VARIANCE;
}

/**
 * Adjusts weights based on performance metrics
 * @param currentWeights Current confidence weights
 * @param metrics Performance metrics
 * @returns Adjusted weights
 */
export function adjustWeights(
    currentWeights: ConfidenceWeights,
    metrics: PerformanceMetrics
): ConfidenceWeights {
    const adjustmentFactor = calculateAdjustmentFactor(metrics);
    const newWeights = { ...currentWeights };

    // Adjust weights based on performance metrics
    Object.keys(newWeights).forEach(key => {
        const k = key as keyof ConfidenceWeights;
        newWeights[k] = Math.max(
            WEIGHT_ADJUSTMENT_CONFIG.MIN_WEIGHT,
            Math.min(
                WEIGHT_ADJUSTMENT_CONFIG.MAX_WEIGHT,
                newWeights[k] + adjustmentFactor
            )
        );
    });

    // Normalize weights to sum to 1
    const sum = Object.values(newWeights).reduce((acc, val) => acc + val, 0);
    Object.keys(newWeights).forEach(key => {
        const k = key as keyof ConfidenceWeights;
        newWeights[k] = newWeights[k] / sum;
    });

    return newWeights;
}

/**
 * Calculates adjustment factor based on performance metrics
 * @param metrics Performance metrics
 * @returns Adjustment factor
 */
function calculateAdjustmentFactor(metrics: PerformanceMetrics): number {
    const successImpact = (metrics.successRate - 0.5) * 2; // -1 to 1
    const errorImpact = (0.5 - metrics.errorRate) * 2; // -1 to 1
    const latencyImpact = Math.max(0, 1 - metrics.latency / 1000); // 0 to 1

    const rawAdjustment = (successImpact + errorImpact + latencyImpact) / 3;
    return Math.max(
        -WEIGHT_ADJUSTMENT_CONFIG.MAX_ADJUSTMENT,
        Math.min(
            WEIGHT_ADJUSTMENT_CONFIG.MAX_ADJUSTMENT,
            rawAdjustment * WEIGHT_ADJUSTMENT_CONFIG.MAX_ADJUSTMENT
        )
    );
}

/**
 * Formats a confidence score as a percentage string
 * @param confidence Confidence score to format
 * @returns Formatted confidence percentage
 */
export function formatConfidence(confidence: number): string {
    return `${(confidence * 100).toFixed(1)}%`;
}

/**
 * Generates a human-readable confidence assessment
 * @param confidence Confidence score
 * @param stage Current stage
 * @returns Human-readable assessment
 */
export function assessConfidence(confidence: number, stage: Stage['type']): string {
    const stageConfig = STAGE_CONFIGS[stage];
    const { min, target } = stageConfig.thresholds;

    if (confidence >= target) {
        return 'Excellent confidence level';
    } else if (confidence >= min) {
        return 'Acceptable confidence level';
    } else {
        return 'Insufficient confidence level';
    }
} 