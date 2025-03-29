/**
 * Enhanced Confidence System Service Tests
 * @description Test suite for the Enhanced Confidence System (ECS)
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfidenceService } from '../../services/confidence/ConfidenceService';
import { DEFAULT_WEIGHTS, PERFORMANCE_THRESHOLDS } from '../../config/confidence';
import {
    ConfidenceDimensions,
    ConfidenceWeights,
} from '../../types/confidence';

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('ConfidenceService', () => {
    let service: ConfidenceService;

    beforeEach(() => {
        service = new ConfidenceService();
    });

    describe('calculateConfidence', () => {
        it('should calculate confidence correctly with valid inputs', async () => {
            const dimensions: ConfidenceDimensions = {
                analytical: 0.8,
                implementation: 0.7,
                pattern: 0.6,
                context: 0.5,
            };

            const result = await service.calculateConfidence(dimensions);

            expect(result.score).toBeLessThanOrEqual(0.95);
            expect(result.score).toBeGreaterThan(0);
            expect(result.dimensions).toEqual(dimensions);
            expect(result.weights).toEqual(DEFAULT_WEIGHTS);
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        it('should throw error with invalid dimensions', async () => {
            const dimensions: ConfidenceDimensions = {
                analytical: 1.2, // Invalid value > 1
                implementation: 0.7,
                pattern: 0.6,
                context: 0.5,
            };

            await expect(service.calculateConfidence(dimensions))
                .rejects
                .toThrow('Invalid confidence dimensions provided');
        });

        it('should throw error with invalid weights', async () => {
            const dimensions: ConfidenceDimensions = {
                analytical: 0.8,
                implementation: 0.7,
                pattern: 0.6,
                context: 0.5,
            };

            const weights: ConfidenceWeights = {
                analytical: 0.5,
                implementation: 0.5,
                pattern: 0.5,
                context: 0.5, // Sum > 1
            };

            await expect(service.calculateConfidence(dimensions, weights))
                .rejects
                .toThrow('Invalid confidence weights provided');
        });
    });

    describe('validateConfidence', () => {
        it('should validate confidence correctly for initial stage', async () => {
            const result = await service.validateConfidence('initial', 0.5);

            expect(result.isValid).toBe(true);
            expect(result.thresholds).toEqual({
                min: 0.4,
                target: 0.6,
            });
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        it('should validate confidence correctly for final stage', async () => {
            const result = await service.validateConfidence('final', 0.95);

            expect(result.isValid).toBe(true);
            expect(result.thresholds).toEqual({
                min: 0.9,
                target: 0.95,
            });
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        it('should return invalid for insufficient confidence', async () => {
            const result = await service.validateConfidence('final', 0.85);

            expect(result.isValid).toBe(false);
            expect(result.thresholds).toEqual({
                min: 0.9,
                target: 0.95,
            });
        });

        it('should throw error with invalid stage', async () => {
            await expect(service.validateConfidence('invalid' as any, 0.5))
                .rejects
                .toThrow('Invalid stage type provided');
        });
    });

    describe('adjustWeights', () => {
        it('should adjust weights correctly', async () => {
            // Wait for rate limit interval
            await wait(PERFORMANCE_THRESHOLDS.MAX_LATENCY + 100);

            const result = await service.adjustWeights(DEFAULT_WEIGHTS);

            expect(result.oldWeights).toEqual(DEFAULT_WEIGHTS);
            expect(result.newWeights).toBeDefined();
            expect(Object.values(result.newWeights).reduce((a, b) => a + b))
                .toBeCloseTo(1, 5);
            expect(result.metrics).toBeDefined();
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        it('should throw error with invalid weights', async () => {
            // Wait for rate limit interval
            await wait(PERFORMANCE_THRESHOLDS.MAX_LATENCY + 100);

            const invalidWeights: ConfidenceWeights = {
                analytical: 0.5,
                implementation: 0.5,
                pattern: 0.5,
                context: 0.5, // Sum > 1
            };

            await expect(service.adjustWeights(invalidWeights))
                .rejects
                .toThrow('Invalid confidence weights provided');
        });
    });

    describe('getMetrics', () => {
        it('should return current metrics', () => {
            const metrics = service.getMetrics();

            expect(metrics.successRate).toBeDefined();
            expect(metrics.errorRate).toBeDefined();
            expect(metrics.latency).toBeDefined();
            expect(metrics.resourceUsage).toBeDefined();
        });
    });
}); 