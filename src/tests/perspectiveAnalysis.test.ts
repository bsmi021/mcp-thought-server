import { describe, it, expect } from 'vitest';
import { DefaultPerspectiveAnalysisService, DefaultPerspectiveOptimizationService } from '../services/perspectiveAnalysis.js';

describe('Perspective Analysis System', () => {
    describe('PerspectiveAnalysisService', () => {
        const service = new DefaultPerspectiveAnalysisService();

        it('should analyze a perspective', async () => {
            const result = await service.analyzePerspective({
                type: {
                    category: 'stakeholder',
                    subcategory: 'primary',
                    weight: 0.8
                },
                viewpoint: 'User Experience',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    role: 'End User',
                    influence: 0.9,
                    interests: ['Ease of use', 'Performance', 'Reliability']
                },
                requirements: [
                    {
                        description: 'Fast response time',
                        priority: 9,
                        rationale: 'Users expect instant feedback',
                        validation: {
                            criteria: 'Response time < 200ms',
                            method: 'Performance testing',
                            status: 'pending'
                        }
                    }
                ],
                constraints: [
                    {
                        type: 'technical',
                        description: 'Must work on mobile devices',
                        impact: 0.8,
                        mitigation: 'Use responsive design'
                    }
                ],
                priorities: [
                    {
                        item: 'Mobile optimization',
                        level: 4,
                        justification: 'High mobile user base'
                    }
                ]
            });

            expect(result).toBeDefined();
            expect(result.viewpoint).toBe('User Experience');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.metadata).toBeDefined();
            expect(result.metadata.version).toBe(1);
        });

        it('should compare perspectives', async () => {
            const perspective1 = await service.analyzePerspective({
                type: {
                    category: 'stakeholder',
                    subcategory: 'primary',
                    weight: 0.8
                },
                viewpoint: 'User Experience',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    role: 'End User',
                    influence: 0.9,
                    interests: ['Ease of use', 'Performance']
                },
                requirements: [],
                constraints: [],
                priorities: []
            });

            const perspective2 = await service.analyzePerspective({
                type: {
                    category: 'technical',
                    subcategory: 'architecture',
                    weight: 0.7
                },
                viewpoint: 'System Architecture',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174001',
                    role: 'Architect',
                    influence: 0.8,
                    interests: ['Scalability', 'Performance']
                },
                requirements: [],
                constraints: [],
                priorities: []
            });

            const result = await service.comparePerspectives([perspective1, perspective2]);

            expect(result).toBeDefined();
            expect(result.similarities).toBeInstanceOf(Array);
            expect(result.differences).toBeInstanceOf(Array);
            expect(result.conflicts).toBeInstanceOf(Array);
            expect(result.metrics).toBeDefined();
            expect(result.metrics.similarityScore).toBeGreaterThanOrEqual(0);
            expect(result.metrics.conflictScore).toBeGreaterThanOrEqual(0);
            expect(result.metrics.resolutionPotential).toBeGreaterThanOrEqual(0);
        });

        it('should synthesize perspectives', async () => {
            const perspective1 = await service.analyzePerspective({
                type: {
                    category: 'stakeholder',
                    subcategory: 'primary',
                    weight: 0.8
                },
                viewpoint: 'User Experience',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    role: 'End User',
                    influence: 0.9,
                    interests: ['Ease of use', 'Performance']
                },
                requirements: [],
                constraints: [],
                priorities: []
            });

            const perspective2 = await service.analyzePerspective({
                type: {
                    category: 'technical',
                    subcategory: 'architecture',
                    weight: 0.7
                },
                viewpoint: 'System Architecture',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174001',
                    role: 'Architect',
                    influence: 0.8,
                    interests: ['Scalability', 'Performance']
                },
                requirements: [],
                constraints: [],
                priorities: []
            });

            const result = await service.synthesizePerspectives([perspective1, perspective2]);

            expect(result).toBeDefined();
            expect(result.commonGround).toBeInstanceOf(Array);
            expect(result.differences).toBeInstanceOf(Array);
            expect(result.conflicts).toBeInstanceOf(Array);
            expect(result.recommendations).toBeInstanceOf(Array);
        });
    });

    describe('PerspectiveOptimizationService', () => {
        const analysisService = new DefaultPerspectiveAnalysisService();
        const optimizationService = new DefaultPerspectiveOptimizationService();

        it('should optimize perspective set', async () => {
            const perspective1 = await analysisService.analyzePerspective({
                type: {
                    category: 'stakeholder',
                    subcategory: 'primary',
                    weight: 0.8
                },
                viewpoint: 'User Experience',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    role: 'End User',
                    influence: 0.9,
                    interests: ['Ease of use', 'Performance']
                },
                requirements: [],
                constraints: [],
                priorities: []
            });

            const perspective2 = await analysisService.analyzePerspective({
                type: {
                    category: 'technical',
                    subcategory: 'architecture',
                    weight: 0.7
                },
                viewpoint: 'System Architecture',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174001',
                    role: 'Architect',
                    influence: 0.8,
                    interests: ['Scalability', 'Performance']
                },
                requirements: [],
                constraints: [],
                priorities: []
            });

            const result = await optimizationService.optimizePerspectiveSet([perspective1, perspective2]);

            expect(result).toBeDefined();
            expect(result.perspectives).toBeInstanceOf(Array);
            expect(result.metrics).toBeDefined();
            expect(result.metrics.complexityReduction).toBeGreaterThanOrEqual(0);
            expect(result.metrics.clarityImprovement).toBeGreaterThanOrEqual(0);
        });

        it('should resolve conflicts', async () => {
            const perspective1 = await analysisService.analyzePerspective({
                type: {
                    category: 'stakeholder',
                    subcategory: 'primary',
                    weight: 0.8
                },
                viewpoint: 'User Experience',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    role: 'End User',
                    influence: 0.9,
                    interests: ['Ease of use', 'Performance']
                },
                requirements: [],
                constraints: [],
                priorities: []
            });

            const perspective2 = await analysisService.analyzePerspective({
                type: {
                    category: 'technical',
                    subcategory: 'architecture',
                    weight: 0.7
                },
                viewpoint: 'System Architecture',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174001',
                    role: 'Architect',
                    influence: 0.8,
                    interests: ['Scalability', 'Performance']
                },
                requirements: [],
                constraints: [],
                priorities: []
            });

            const conflict = {
                description: 'Conflicting requirements',
                perspectives: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
                severity: 0.8,
                resolutionOptions: ['Option A', 'Option B']
            };

            const result = await optimizationService.resolveConflicts(conflict, [perspective1, perspective2]);

            expect(result).toBeDefined();
            expect(result.resolutionSteps).toBeInstanceOf(Array);
            expect(result.updatedPerspectives).toBeInstanceOf(Array);
        });

        it('should validate perspectives', async () => {
            const perspective1 = await analysisService.analyzePerspective({
                type: {
                    category: 'stakeholder',
                    subcategory: 'primary',
                    weight: 0.8
                },
                viewpoint: 'User Experience',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    role: 'End User',
                    influence: 0.9,
                    interests: ['Ease of use', 'Performance']
                },
                requirements: [],
                constraints: [],
                priorities: []
            });

            const perspective2 = await analysisService.analyzePerspective({
                type: {
                    category: 'technical',
                    subcategory: 'architecture',
                    weight: 0.7
                },
                viewpoint: 'System Architecture',
                stakeholder: {
                    id: '123e4567-e89b-12d3-a456-426614174001',
                    role: 'Architect',
                    influence: 0.8,
                    interests: ['Scalability', 'Performance']
                },
                requirements: [],
                constraints: [],
                priorities: []
            });

            const result = await optimizationService.validatePerspectives([perspective1, perspective2], {
                strictMode: true,
                validateRelationships: true,
                maxValidationDepth: 3
            });

            expect(result).toBeDefined();
            expect(result.isValid).toBeDefined();
            expect(result.errors).toBeInstanceOf(Array);
            expect(result.warnings).toBeInstanceOf(Array);
        });
    });
}); 