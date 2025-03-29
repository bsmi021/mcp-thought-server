import { z } from 'zod';

// Core Types
export const PrototypeStatus = z.enum(['draft', 'testing', 'validated', 'rejected']);
export type PrototypeStatus = z.infer<typeof PrototypeStatus>;

export const FeedbackType = z.enum(['bug', 'enhancement', 'performance', 'security', 'other']);
export type FeedbackType = z.infer<typeof FeedbackType>;

export const ImplementationType = z.enum(['service', 'component', 'system', 'integration']);
export type ImplementationType = z.infer<typeof ImplementationType>;

// Validation Schemas
export const Concept = z.object({
    description: z.string(),
    objectives: z.array(z.string()),
    constraints: z.array(z.string()),
    assumptions: z.array(z.string()),
    scope: z.object({
        included: z.array(z.string()),
        excluded: z.array(z.string()),
    }),
});
export type Concept = z.infer<typeof Concept>;

export const Implementation = z.object({
    type: ImplementationType,
    components: z.array(z.object({
        name: z.string(),
        description: z.string(),
        dependencies: z.array(z.string()),
    })),
    interfaces: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string(),
    })),
    dependencies: z.array(z.object({
        name: z.string(),
        version: z.string(),
        type: z.string(),
    })),
    configuration: z.record(z.string(), z.unknown()),
});
export type Implementation = z.infer<typeof Implementation>;

export const PrototypeMetrics = z.object({
    performance: z.object({
        responseTime: z.number(),
        throughput: z.number(),
        resourceUsage: z.number(),
    }),
    quality: z.object({
        codeQuality: z.number(),
        testCoverage: z.number(),
        bugCount: z.number(),
    }),
    coverage: z.object({
        lines: z.number(),
        functions: z.number(),
        branches: z.number(),
    }),
    feedback: z.object({
        positiveCount: z.number(),
        negativeCount: z.number(),
        averageRating: z.number(),
    }),
});
export type PrototypeMetrics = z.infer<typeof PrototypeMetrics>;

export const PrototypeFeedback = z.object({
    source: z.string(),
    type: FeedbackType,
    content: z.string(),
    priority: z.number().min(1).max(5),
    impact: z.object({
        scope: z.string(),
        severity: z.number().min(1).max(5),
        effort: z.number().min(1).max(5),
    }),
});
export type PrototypeFeedback = z.infer<typeof PrototypeFeedback>;

export const Prototype = z.object({
    id: z.string().uuid(),
    version: z.number().positive(),
    concept: Concept,
    implementation: Implementation,
    status: z.object({
        phase: PrototypeStatus,
        confidence: z.number().min(0).max(1),
        issues: z.array(z.string()),
        lastUpdate: z.date(),
    }),
    metrics: PrototypeMetrics,
    feedback: z.array(PrototypeFeedback),
    history: z.array(z.object({
        timestamp: z.date(),
        change: z.string(),
        reason: z.string(),
    })),
    metadata: z.record(z.string(), z.unknown()),
});
export type Prototype = z.infer<typeof Prototype>; 