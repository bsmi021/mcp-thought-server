/**
 * Enhanced Confidence System Service
 * @description Main service implementation for the Enhanced Confidence System (ECS)
 * @version 1.0.0
 */

import {
    ConfidenceDimensions,
    ConfidenceWeights,
    Stage,
    PerformanceMetrics,
    CalculationContext,
    ValidationContext,
    AdjustmentContext,
    ConfidenceResponse,
    ValidationResponse,
    AdjustmentResponse,
} from '../../types/confidence';

import {
    DEFAULT_WEIGHTS,
    STAGE_CONFIGS,
    PERFORMANCE_THRESHOLDS,
    ERROR_MESSAGES,
} from '../../config/confidence';

import {
    validateDimensions,
    validateWeights,
    calculateConfidence,
    validateStageThresholds,
    validateDimensionVariance,
    adjustWeights,
} from '../../utils/confidence';

/**
 * Enhanced Confidence Service class
 */
export class ConfidenceService {
    private metrics: PerformanceMetrics;
    private lastAdjustmentTime: number;

    constructor() {
        this.metrics = {
            successRate: 1,
            errorRate: 0,
            latency: 0,
            resourceUsage: 0,
        };
        this.lastAdjustmentTime = Date.now();
    }

    /**
     * Calculates confidence score
     * @param dimensions Confidence dimensions
     * @param weights Optional confidence weights
     * @param context Optional calculation context
     * @returns Confidence calculation response
     * @throws Error if validation fails
     */
    public async calculateConfidence(
        dimensions: ConfidenceDimensions,
        weights: ConfidenceWeights = DEFAULT_WEIGHTS,
        context?: CalculationContext
    ): Promise<ConfidenceResponse> {
        const startTime = Date.now();

        try {
            // Validate inputs
            if (!validateDimensions(dimensions)) {
                throw new Error(ERROR_MESSAGES.INVALID_DIMENSIONS);
            }
            if (!validateWeights(weights)) {
                throw new Error(ERROR_MESSAGES.INVALID_WEIGHTS);
            }

            // Calculate confidence
            const score = calculateConfidence(dimensions, weights);

            // Update metrics
            this.updateMetrics(true, Date.now() - startTime);

            return {
                score,
                dimensions,
                weights,
                timestamp: new Date(),
            };
        } catch (error) {
            // Update error metrics
            this.updateMetrics(false, Date.now() - startTime);
            throw error;
        }
    }

    /**
     * Validates confidence against stage thresholds
     * @param stage Stage to validate against
     * @param confidence Confidence score to validate
     * @param context Optional validation context
     * @returns Validation response
     * @throws Error if validation fails
     */
    public async validateConfidence(
        stage: Stage['type'],
        confidence: number,
        context?: ValidationContext
    ): Promise<ValidationResponse> {
        const startTime = Date.now();

        try {
            const stageConfig = STAGE_CONFIGS[stage];
            if (!stageConfig) {
                throw new Error(ERROR_MESSAGES.INVALID_STAGE);
            }

            const isValid = validateStageThresholds(stage, confidence);

            // Update metrics
            this.updateMetrics(true, Date.now() - startTime);

            return {
                isValid,
                thresholds: stageConfig.thresholds,
                timestamp: new Date(),
            };
        } catch (error) {
            // Update error metrics
            this.updateMetrics(false, Date.now() - startTime);
            throw error;
        }
    }

    /**
     * Adjusts weights based on performance metrics
     * @param currentWeights Current confidence weights
     * @param context Optional adjustment context
     * @returns Weight adjustment response
     * @throws Error if adjustment fails
     */
    public async adjustWeights(
        currentWeights: ConfidenceWeights,
        context?: AdjustmentContext
    ): Promise<AdjustmentResponse> {
        const startTime = Date.now();

        try {
            // Validate current weights
            if (!validateWeights(currentWeights)) {
                throw new Error(ERROR_MESSAGES.INVALID_WEIGHTS);
            }

            // Check if enough time has passed since last adjustment
            const timeSinceLastAdjustment = Date.now() - this.lastAdjustmentTime;
            if (timeSinceLastAdjustment < PERFORMANCE_THRESHOLDS.MAX_LATENCY) {
                throw new Error(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
            }

            // Adjust weights based on performance metrics
            const newWeights = adjustWeights(currentWeights, this.metrics);

            // Update metrics and last adjustment time
            this.updateMetrics(true, Date.now() - startTime);
            this.lastAdjustmentTime = Date.now();

            return {
                oldWeights: currentWeights,
                newWeights,
                metrics: { ...this.metrics },
                timestamp: new Date(),
            };
        } catch (error) {
            // Update error metrics
            this.updateMetrics(false, Date.now() - startTime);
            throw error;
        }
    }

    /**
     * Gets current performance metrics
     * @returns Current performance metrics
     */
    public getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * Updates service metrics
     * @param success Whether the operation was successful
     * @param latency Operation latency in milliseconds
     */
    private updateMetrics(success: boolean, latency: number): void {
        // Update success/error rates with exponential moving average
        const alpha = 0.1; // Smoothing factor
        if (success) {
            this.metrics.successRate = (1 - alpha) * this.metrics.successRate + alpha;
            this.metrics.errorRate = (1 - alpha) * this.metrics.errorRate;
        } else {
            this.metrics.successRate = (1 - alpha) * this.metrics.successRate;
            this.metrics.errorRate = (1 - alpha) * this.metrics.errorRate + alpha;
        }

        // Update latency with exponential moving average
        this.metrics.latency = (1 - alpha) * this.metrics.latency + alpha * latency;

        // Update resource usage (simple process memory usage)
        this.metrics.resourceUsage = process.memoryUsage().heapUsed;
    }
} 