/**
 * API endpoints for the Perspective Analysis System (PAS)
 * Based on RFC 006: Perspective Analysis System
 */

import { z } from 'zod';
import type {
    Perspective,
    PerspectiveType,
    Stakeholder,
    Requirement,
    Constraint,
    Priority,
    PerspectiveMetadata,
    CommonGround,
    Difference,
    Conflict,
    Recommendation,
    Synthesis,
    ComparisonMetrics,
    ComparisonResult,
    AnalysisConfig,
    ComparisonConfig,
    SynthesisConfig,
    ValidationConfig
} from '../types/perspectiveAnalysis.js';
import {
    PerspectiveSchema,
    ComparisonResultSchema,
    SynthesisSchema,
    ConflictSchema,
    ValidationConfigSchema
} from '../types/perspectiveAnalysis.js';
import { DefaultPerspectiveAnalysisService, DefaultPerspectiveOptimizationService } from './perspectiveAnalysis.js';

/**
 * Request/response types for the PAS API
 */
export interface PerspectiveAnalysisRequest {
    /** Input data for perspective analysis */
    input: {
        /** Type classification */
        type: PerspectiveType;
        /** Main viewpoint or stance */
        viewpoint: string;
        /** Associated stakeholder */
        stakeholder: Stakeholder;
        /** List of requirements */
        requirements: Requirement[];
        /** List of constraints */
        constraints: Constraint[];
        /** List of priorities */
        priorities: Priority[];
        /** Optional metadata */
        metadata?: PerspectiveMetadata;
    };
    /** Optional analysis configuration */
    config?: AnalysisConfig;
}

/**
 * Response type for perspective analysis
 */
export interface PerspectiveAnalysisResponse {
    /** The analyzed perspective */
    perspective: Perspective;
    /** Processing timestamp */
    timestamp: string;
}

/**
 * Request type for perspective comparison
 */
export interface PerspectiveComparisonRequest {
    /** Array of perspectives to compare */
    perspectives: Perspective[];
    /** Optional comparison configuration */
    config?: ComparisonConfig;
}

/**
 * Response type for perspective comparison
 */
export interface PerspectiveComparisonResponse {
    /** Comparison results */
    result: ComparisonResult;
    /** Processing timestamp */
    timestamp: string;
}

/**
 * Request type for perspective synthesis
 */
export interface PerspectiveSynthesisRequest {
    /** Array of perspectives to synthesize */
    perspectives: Perspective[];
    /** Optional synthesis configuration */
    config?: SynthesisConfig;
}

/**
 * Response type for perspective synthesis
 */
export interface PerspectiveSynthesisResponse {
    /** Synthesis results */
    synthesis: Synthesis;
    /** Processing timestamp */
    timestamp: string;
}

/**
 * Request type for perspective optimization
 */
export interface PerspectiveOptimizationRequest {
    /** Array of perspectives to optimize */
    perspectives: Perspective[];
}

/**
 * Response type for perspective optimization
 */
export interface PerspectiveOptimizationResponse {
    /** Optimized perspectives */
    perspectives: Perspective[];
    /** Optimization metrics */
    metrics: {
        /** Reduction in complexity (0-1) */
        complexityReduction: number;
        /** Improvement in clarity (0-1) */
        clarityImprovement: number;
    };
    /** Processing timestamp */
    timestamp: string;
}

/**
 * Request type for conflict resolution
 */
export interface ConflictResolutionRequest {
    /** The conflict to resolve */
    conflict: Conflict;
    /** Array of perspectives involved in the conflict */
    perspectives: Perspective[];
}

/**
 * Response type for conflict resolution
 */
export interface ConflictResolutionResponse {
    /** Steps to resolve the conflict */
    resolutionSteps: string[];
    /** Updated perspectives after resolution */
    updatedPerspectives: Perspective[];
    /** Processing timestamp */
    timestamp: string;
}

/**
 * Request type for perspective validation
 */
export interface PerspectiveValidationRequest {
    /** Array of perspectives to validate */
    perspectives: Perspective[];
    /** Validation configuration */
    config: ValidationConfig;
}

/**
 * Response type for perspective validation
 */
export interface PerspectiveValidationResponse {
    /** Whether the perspectives are valid */
    isValid: boolean;
    /** Array of validation errors */
    errors: string[];
    /** Array of validation warnings */
    warnings: string[];
    /** Processing timestamp */
    timestamp: string;
}

/**
 * API service class for the Perspective Analysis System
 */
export class PerspectiveAnalysisApi {
    private analysisService: DefaultPerspectiveAnalysisService;
    private optimizationService: DefaultPerspectiveOptimizationService;

    /**
     * Creates a new instance of the PAS API
     * @param analysisService Service for analyzing perspectives
     * @param optimizationService Service for optimizing perspectives
     */
    constructor(
        analysisService: DefaultPerspectiveAnalysisService = new DefaultPerspectiveAnalysisService(),
        optimizationService: DefaultPerspectiveOptimizationService = new DefaultPerspectiveOptimizationService()
    ) {
        this.analysisService = analysisService;
        this.optimizationService = optimizationService;
    }

    /**
     * Analyzes a perspective based on input data
     * @param request Analysis request containing input data and optional configuration
     * @returns Analysis response with the analyzed perspective
     */
    async analyzePerspective(request: PerspectiveAnalysisRequest): Promise<PerspectiveAnalysisResponse> {
        const perspective = await this.analysisService.analyzePerspective(request.input, request.config);
        return {
            perspective,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Compares multiple perspectives
     * @param request Comparison request containing perspectives and optional configuration
     * @returns Comparison response with similarities, differences, conflicts, and metrics
     */
    async comparePerspectives(request: PerspectiveComparisonRequest): Promise<PerspectiveComparisonResponse> {
        const result = await this.analysisService.comparePerspectives(request.perspectives, request.config);
        return {
            result,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Synthesizes multiple perspectives
     * @param request Synthesis request containing perspectives and optional configuration
     * @returns Synthesis response with common ground, differences, conflicts, and recommendations
     */
    async synthesizePerspectives(request: PerspectiveSynthesisRequest): Promise<PerspectiveSynthesisResponse> {
        const synthesis = await this.analysisService.synthesizePerspectives(request.perspectives, request.config);
        return {
            synthesis,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Optimizes a set of perspectives
     * @param request Optimization request containing perspectives to optimize
     * @returns Optimization response with optimized perspectives and metrics
     */
    async optimizePerspectives(request: PerspectiveOptimizationRequest): Promise<PerspectiveOptimizationResponse> {
        const result = await this.optimizationService.optimizePerspectiveSet(request.perspectives);
        return {
            perspectives: result.perspectives,
            metrics: result.metrics,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Resolves conflicts between perspectives
     * @param request Conflict resolution request containing conflict and involved perspectives
     * @returns Resolution response with steps and updated perspectives
     */
    async resolveConflicts(request: ConflictResolutionRequest): Promise<ConflictResolutionResponse> {
        const result = await this.optimizationService.resolveConflicts(request.conflict, request.perspectives);
        return {
            resolutionSteps: result.resolutionSteps,
            updatedPerspectives: result.updatedPerspectives,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Validates a set of perspectives
     * @param request Validation request containing perspectives and configuration
     * @returns Validation response with validation status, errors, and warnings
     */
    async validatePerspectives(request: PerspectiveValidationRequest): Promise<PerspectiveValidationResponse> {
        const result = await this.optimizationService.validatePerspectives(request.perspectives, request.config);
        return {
            isValid: result.isValid,
            errors: result.errors,
            warnings: result.warnings,
            timestamp: new Date().toISOString()
        };
    }
}

// Error Types
export class PerspectiveAnalysisError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'PerspectiveAnalysisError';
    }
}

export class ValidationError extends PerspectiveAnalysisError {
    constructor(message: string, details?: unknown) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

export class OptimizationError extends PerspectiveAnalysisError {
    constructor(message: string, details?: unknown) {
        super(message, 'OPTIMIZATION_ERROR', details);
        this.name = 'OptimizationError';
    }
}

// Export API instance
export const perspectiveAnalysisApi = new PerspectiveAnalysisApi(); 