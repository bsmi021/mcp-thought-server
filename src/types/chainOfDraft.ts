import { z } from 'zod';

// Core configuration types
export interface DraftConfig {
    maxDrafts: number;
    contextWindow: number;
    confidenceThreshold: number;
    minConfidenceGrowth: number;  // Minimum confidence increase between drafts
    minRevisionConfidence: number;  // Minimum confidence for revisions
    enableParallelProcessing: boolean;
    revisionEnabled: boolean;
    creativeContentEnabled?: boolean;
}

export interface EnhancementConfig {
    enableSummarization: boolean;
    draftCategorization: boolean;
    progressTracking: boolean;
    dynamicAdaptation: boolean;
}

export interface DebugConfig {
    errorCapture: boolean;
    metricTracking: boolean;
    performanceMonitoring: boolean;
}

// Draft state and metadata types
export interface DraftMetrics {
    processingTime: number;
    resourceUsage: number;
    dependencyChain: string[];
    initialization?: DraftInitialization;
    dynamicAdaptation?: DynamicAdaptation;
    processingState?: ProcessingState;
}

export interface DraftInitialization {
    problemScope: string;
    estimatedDrafts: number;
    initialParameters: {
        maxDrafts: number;
        contextWindow: number;
        confidenceThreshold: number;
    };
    assumptions: string[];
    constraints: string[];
}

export interface DynamicAdaptation {
    contextBasedAdjustments: Record<string, unknown>;
    resourceOptimization: {
        memoryUsage: number;
        processingTime: number;
        recommendedAdjustments: string[];
    };
    performanceMetrics: {
        averageProcessingTime: number;
        successRate: number;
        revisionEfficiency: number;
    };
}

export interface ProcessingState {
    currentPhase: 'initialization' | 'drafting' | 'critique' | 'revision' | 'completion';
    activeThreads: number;
    pendingRevisions: string[];
    completedSteps: number;
    estimatedRemainingSteps: number;
    adaptationHistory: Array<{
        timestamp: number;
        adjustment: string;
        reason: string;
    }>;
}

export interface DraftContext {
    problemScope?: string;
    assumptions?: string[];
    constraints?: string[];
}

export interface DraftCategory {
    type: 'initial' | 'critique' | 'revision' | 'final' | 'creative';
    confidence: number;
    metadata?: Record<string, unknown>;
    contentType?: 'technical' | 'creative' | 'hybrid';
}

// Main draft data interface
export interface DraftData {
    content?: string;
    draftNumber: number;
    totalDrafts: number;
    needsRevision: boolean;
    isRevision?: boolean;
    revisesDraft?: number;
    category?: DraftCategory;
    confidence?: number;
    metrics?: DraftMetrics;
    context?: DraftContext;
    isCritique?: boolean;
    critiqueFocus?: string;
    reasoningChain?: string[];
    nextStepNeeded?: boolean;
    creativityScore?: number;
}

// Zod schema for runtime validation with coercion
export const draftDataSchema = z.object({
    content: z.string().optional(),
    draftNumber: z.union([
        z.number().min(1),
        z.string().transform(val => parseInt(val, 10))
    ]),
    totalDrafts: z.union([
        z.number().min(1),
        z.string().transform(val => parseInt(val, 10))
    ]),
    needsRevision: z.union([
        z.boolean(),
        z.string().transform(val => val === 'true')
    ]),
    isRevision: z.union([
        z.boolean(),
        z.string().transform(val => val === 'true')
    ]).optional(),
    revisesDraft: z.union([
        z.number().min(1),
        z.string().transform(val => parseInt(val, 10))
    ]).optional(),
    category: z.object({
        type: z.enum(['initial', 'critique', 'revision', 'final', 'creative']),
        confidence: z.number().min(0).max(1),
        metadata: z.record(z.unknown()).optional(),
        contentType: z.enum(['technical', 'creative', 'hybrid']).optional()
    }).optional(),
    confidence: z.number().min(0).max(1).optional(),
    context: z.object({
        problemScope: z.string().optional(),
        assumptions: z.array(z.string()).optional(),
        constraints: z.array(z.string()).optional()
    }).optional(),
    isCritique: z.union([
        z.boolean(),
        z.string().transform(val => val === 'true')
    ]).optional(),
    critiqueFocus: z.string().optional(),
    reasoningChain: z.union([
        z.array(z.string()),
        z.string().transform(val => {
            try {
                return JSON.parse(val);
            } catch {
                throw new Error('Invalid reasoningChain format');
            }
        })
    ]).optional(),
    nextStepNeeded: z.union([
        z.boolean(),
        z.string().transform(val => val === 'true')
    ]).optional(),
    creativityScore: z.number().min(0).max(1).optional()
}); 