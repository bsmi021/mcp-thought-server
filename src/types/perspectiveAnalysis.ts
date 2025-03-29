/**
 * Types for the Perspective Analysis System (PAS)
 * Based on RFC 006: Perspective Analysis System
 */

import { z } from 'zod';

/**
 * Represents the type of perspective being analyzed
 */
export const PerspectiveTypeSchema = z.object({
    /** The main category of the perspective (stakeholder, technical, business) */
    category: z.enum(['stakeholder', 'technical', 'business']),
    /** A more specific subcategory within the main category */
    subcategory: z.string(),
    /** The relative importance or influence of this perspective type (0-1) */
    weight: z.number().min(0).max(1)
});

/**
 * Represents a stakeholder in the system
 */
export const StakeholderSchema = z.object({
    /** Unique identifier for the stakeholder */
    id: z.string().uuid(),
    /** The role or position of the stakeholder */
    role: z.string(),
    /** The level of influence this stakeholder has (0-1) */
    influence: z.number().min(0).max(1),
    /** List of interests or concerns of the stakeholder */
    interests: z.array(z.string())
});

/**
 * Represents a requirement in the system
 */
export const RequirementSchema = z.object({
    /** Detailed description of the requirement */
    description: z.string(),
    /** Priority level of the requirement (1-10) */
    priority: z.number().min(1).max(10),
    /** Justification or reasoning behind the requirement */
    rationale: z.string(),
    /** Validation criteria and status */
    validation: z.object({
        /** Specific criteria for validating this requirement */
        criteria: z.string(),
        /** Method used for validation */
        method: z.string(),
        /** Current validation status */
        status: z.enum(['pending', 'validated', 'failed'])
    })
});

/**
 * Represents a constraint in the system
 */
export const ConstraintSchema = z.object({
    /** Type of constraint */
    type: z.string(),
    /** Detailed description of the constraint */
    description: z.string(),
    /** Level of impact this constraint has (0-1) */
    impact: z.number().min(0).max(1),
    /** Optional mitigation strategy */
    mitigation: z.string().optional()
});

/**
 * Represents a priority in the system
 */
export const PrioritySchema = z.object({
    /** Item or feature being prioritized */
    item: z.string(),
    /** Priority level (1-5) */
    level: z.number().min(1).max(5),
    /** Justification for the priority level */
    justification: z.string()
});

/**
 * Metadata for a perspective
 */
export const PerspectiveMetadataSchema = z.object({
    /** Creation timestamp */
    createdAt: z.date(),
    /** Last update timestamp */
    updatedAt: z.date(),
    /** Version number */
    version: z.number(),
    /** Associated tags */
    tags: z.array(z.string()),
    /** Optional source information */
    source: z.string().optional()
});

/**
 * Core perspective object that combines all aspects
 */
export const PerspectiveSchema = z.object({
    /** Unique identifier */
    id: z.string().uuid(),
    /** Type classification */
    type: PerspectiveTypeSchema,
    /** Main viewpoint or stance */
    viewpoint: z.string(),
    /** Associated stakeholder */
    stakeholder: StakeholderSchema,
    /** List of requirements */
    requirements: z.array(RequirementSchema),
    /** List of constraints */
    constraints: z.array(ConstraintSchema),
    /** List of priorities */
    priorities: z.array(PrioritySchema),
    /** Confidence level in this perspective (0-1) */
    confidence: z.number().min(0).max(1),
    /** Associated metadata */
    metadata: PerspectiveMetadataSchema
});

/**
 * Represents common ground between perspectives
 */
export const CommonGroundSchema = z.object({
    /** Description of the common ground */
    description: z.string(),
    /** List of perspective IDs that share this common ground */
    perspectives: z.array(z.string().uuid()),
    strength: z.number().min(0).max(1)
});

export const DifferenceSchema = z.object({
    description: z.string(),
    perspectives: z.array(z.string().uuid()),
    impact: z.number().min(0).max(1),
    resolutionPath: z.string().optional()
});

export const ConflictSchema = z.object({
    description: z.string(),
    perspectives: z.array(z.string().uuid()),
    severity: z.number().min(0).max(1),
    resolutionOptions: z.array(z.string())
});

export const RecommendationSchema = z.object({
    description: z.string(),
    impact: z.number().min(0).max(1),
    effort: z.number().min(0).max(1),
    priority: z.number().min(1).max(5),
    dependencies: z.array(z.string()).optional()
});

export const SynthesisSchema = z.object({
    commonGround: z.array(CommonGroundSchema),
    differences: z.array(DifferenceSchema),
    conflicts: z.array(ConflictSchema),
    recommendations: z.array(RecommendationSchema)
});

export const ComparisonMetricsSchema = z.object({
    similarityScore: z.number().min(0).max(1),
    conflictScore: z.number().min(0).max(1),
    resolutionPotential: z.number().min(0).max(1)
});

export const ComparisonResultSchema = z.object({
    similarities: z.array(z.object({
        description: z.string(),
        perspectives: z.array(z.string().uuid()),
        score: z.number().min(0).max(1)
    })),
    differences: z.array(DifferenceSchema),
    conflicts: z.array(ConflictSchema),
    metrics: ComparisonMetricsSchema
});

// Configuration Types
export const AnalysisConfigSchema = z.object({
    confidenceThreshold: z.number().min(0).max(1),
    maxIterations: z.number().min(1),
    includeMetadata: z.boolean().optional()
});

export const ComparisonConfigSchema = z.object({
    similarityThreshold: z.number().min(0).max(1),
    conflictThreshold: z.number().min(0).max(1),
    includeMetrics: z.boolean().optional()
});

export const SynthesisConfigSchema = z.object({
    minCommonGroundStrength: z.number().min(0).max(1),
    maxConflicts: z.number().min(0),
    priorityThreshold: z.number().min(1).max(5)
});

export const ValidationConfigSchema = z.object({
    strictMode: z.boolean(),
    validateRelationships: z.boolean().optional(),
    maxValidationDepth: z.number().min(1).optional()
});

// Type Exports
export type PerspectiveType = z.infer<typeof PerspectiveTypeSchema>;
export type Stakeholder = z.infer<typeof StakeholderSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type Constraint = z.infer<typeof ConstraintSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type PerspectiveMetadata = z.infer<typeof PerspectiveMetadataSchema>;
export type Perspective = z.infer<typeof PerspectiveSchema>;
export type CommonGround = z.infer<typeof CommonGroundSchema>;
export type Difference = z.infer<typeof DifferenceSchema>;
export type Conflict = z.infer<typeof ConflictSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type Synthesis = z.infer<typeof SynthesisSchema>;
export type ComparisonMetrics = z.infer<typeof ComparisonMetricsSchema>;
export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;
export type AnalysisConfig = z.infer<typeof AnalysisConfigSchema>;
export type ComparisonConfig = z.infer<typeof ComparisonConfigSchema>;
export type SynthesisConfig = z.infer<typeof SynthesisConfigSchema>;
export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;

// Additional Type Exports
export interface PerspectiveInput {
    viewpoint: string;
    stakeholder: {
        role: string;
        interests: string[];
    };
    requirements: {
        description: string;
        priority: number;
        rationale: string;
    }[];
}

export interface PerspectiveAnalysis {
    perspective: Perspective;
    confidence: number;
    insights: string[];
    recommendations: string[];
}

export interface Resolution {
    resolvedConflicts: Conflict[];
    resolutionSteps: string[];
    success: boolean;
    remainingIssues?: string[];
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    metrics: ValidationMetrics;
}

export interface ValidationError {
    code: string;
    message: string;
    path: string[];
    severity: 'error';
}

export interface ValidationWarning {
    code: string;
    message: string;
    path: string[];
    severity: 'warning';
}

export interface ValidationMetrics {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
    validationTime: number;
}

export interface OptimizationResult {
    optimizedPerspectives: Perspective[];
    improvements: string[];
    metrics: {
        originalComplexity: number;
        optimizedComplexity: number;
        reductionPercentage: number;
    };
} 