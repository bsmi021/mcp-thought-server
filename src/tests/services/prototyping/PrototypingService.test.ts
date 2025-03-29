import { describe, it, expect } from 'vitest';
import { PrototypingService } from '../../../services/prototyping/PrototypingService';
import { Concept } from '../../../types/prototyping';

describe('PrototypingService', () => {
    const service = new PrototypingService();

    const mockConcept: Concept = {
        description: 'Test prototype',
        objectives: ['Test objective'],
        constraints: ['Test constraint'],
        assumptions: ['Test assumption'],
        scope: {
            included: ['Feature A'],
            excluded: ['Feature B'],
        },
    };

    describe('createPrototype', () => {
        it('should create a new prototype with initial values', async () => {
            const prototype = await service.createPrototype(mockConcept);

            expect(prototype.id).toBeDefined();
            expect(prototype.version).toBe(1);
            expect(prototype.concept).toEqual(mockConcept);
            expect(prototype.status.phase).toBe('draft');
            expect(prototype.status.confidence).toBe(0);
            expect(prototype.metrics.performance.responseTime).toBe(0);
            expect(prototype.history).toHaveLength(1);
            expect(prototype.history[0].change).toBe('Created prototype');
        });
    });

    describe('validatePrototype', () => {
        it('should validate a prototype and return issues', async () => {
            const prototype = await service.createPrototype(mockConcept);
            const result = await service.validatePrototype(prototype);

            expect(result.isValid).toBe(false);
            expect(result.issues).toContain('No components defined');
            expect(result.issues).toContain('No interfaces defined');
            expect(result.confidence).toBeLessThan(1);
        });
    });

    describe('evaluatePrototype', () => {
        it('should evaluate a prototype and provide recommendations', async () => {
            const prototype = await service.createPrototype(mockConcept);
            const result = await service.evaluatePrototype(prototype);

            expect(result.recommendations).toContain('Increase test coverage');
            expect(result.confidence).toBeLessThan(1);
            expect(result.metrics).toBeDefined();
        });
    });

    describe('optimizePrototype', () => {
        it('should optimize a prototype and return improvements', async () => {
            const prototype = await service.createPrototype(mockConcept);

            // Set initial metrics for testing optimization
            prototype.metrics.quality.codeQuality = 0.5;
            prototype.metrics.performance.resourceUsage = 0.9;

            const result = await service.optimizePrototype(prototype);

            expect(result.improvements).toContain('Optimize resource usage');
            expect(result.improvements).toContain('Improve code quality');
            expect(result.confidence).toBeLessThan(1);
            expect(result.metrics.quality.codeQuality).toBeGreaterThan(0.5);
            expect(result.metrics.performance.resourceUsage).toBeLessThan(0.9);
        });
    });

    describe('benchmarkPrototype', () => {
        it('should benchmark a prototype against others', async () => {
            // Create a new service instance for this test to ensure clean state
            const benchmarkService = new PrototypingService();

            // Create two prototypes for comparison
            const prototype1 = await benchmarkService.createPrototype({
                ...mockConcept,
                description: 'Prototype 1',
            });

            const prototype2 = await benchmarkService.createPrototype({
                ...mockConcept,
                description: 'Prototype 2',
            });

            // Set different metrics for comparison
            prototype1.metrics.performance.responseTime = 100;
            prototype2.metrics.performance.responseTime = 200;

            const result = await benchmarkService.benchmarkPrototype(prototype1);

            expect(result.comparisons).toHaveLength(1);
            expect(result.comparisons[0].name).toBe('Prototype 2');
            expect(result.comparisons[0].difference).toBeGreaterThan(0);
        });
    });
}); 