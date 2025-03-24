// Core configuration interfaces
export interface CoreConfig {
    maxDepth: number;
    parallelTasks: boolean;
    contextWindow: number;
    branchingEnabled: boolean;
    revisionEnabled: boolean;
    confidenceThreshold: number;
}

export interface EnhancementConfig {
    enableSummarization: boolean;
    thoughtCategorization: boolean;
    progressTracking: boolean;
    dynamicAdaptation: boolean;
}

export interface DebugConfig {
    errorCapture: boolean;
    metricTracking: boolean;
    performanceMonitoring: boolean;
}

export interface ThoughtCategory {
    type: 'analysis' | 'hypothesis' | 'verification' | 'revision' | 'solution';
    confidence: number;
    metadata?: Record<string, unknown>;
}

export interface ThoughtInitialization {
    problemScope: string;
    estimatedThoughts: number;
    initialParameters: {
        maxDepth?: number;
        contextWindow?: number;
        confidenceThreshold?: number;
    };
    assumptions: string[];
    constraints: string[];
}

export interface DynamicAdaptation {
    contextBasedAdjustments: {
        confidenceThreshold?: number;
        maxDepth?: number;
        parallelProcessing?: boolean;
    };
    resourceOptimization: {
        memoryUsage: number;
        processingTime: number;
        recommendedAdjustments?: string[];
    };
    performanceMetrics: {
        averageProcessingTime: number;
        successRate: number;
        branchingEfficiency: number;
    };
}

export interface ProcessingState {
    currentPhase: 'initialization' | 'processing' | 'revision' | 'completion';
    activeThreads: number;
    pendingBranches: string[];
    completedSteps: number;
    estimatedRemainingSteps: number;
    adaptationHistory: Array<{
        timestamp: number;
        adjustment: string;
        reason: string;
    }>;
}

export interface ThoughtMetrics {
    processingTime: number;
    resourceUsage: number;
    dependencyChain: string[];
    processingState?: ProcessingState;
    dynamicAdaptation?: DynamicAdaptation;
    initialization?: ThoughtInitialization;
}

export interface ThoughtContext {
    problemScope?: string;
    assumptions?: string[];
    constraints?: string[];
}

// Enhanced ThoughtData interface
export interface SequentialThoughtData {
    thought: string;
    thoughtNumber: number;
    totalThoughts: number;
    nextThoughtNeeded: boolean;
    isRevision?: boolean;
    revisesThought?: number;
    branchFromThought?: number;
    branchId?: string;
    needsMoreThoughts?: boolean;
    category?: ThoughtCategory;
    confidence?: number;
    metrics?: ThoughtMetrics;
    context?: ThoughtContext;
}
