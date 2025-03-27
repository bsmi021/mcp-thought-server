export interface SequentialThoughtData {
    thought: string;
    thoughtNumber: number;
    totalThoughts: number;
    nextThoughtNeeded: boolean;
    branchId?: string;
    branchFromThought?: number;
    isRevision?: boolean;
    revisesThought?: number;
    needsMoreThoughts?: boolean;
    confidence?: number;
    category?: {
        type: 'analysis' | 'hypothesis' | 'verification' | 'revision' | 'solution';
        confidence: number;
        metadata?: Record<string, unknown>;
    };
    context?: {
        problemScope?: string;
        assumptions?: string[];
        constraints?: string[];
    };
    metrics?: {
        processingTime: number;
        resourceUsage: number;
        dependencyChain: string[];
        dynamicAdaptation?: {
            confidenceThreshold: number;
            parallelProcessing: boolean;
            resourceOptimization: string[];
        };
        performanceMetrics?: {
            averageProcessingTime: number;
            successRate: number;
            branchingEfficiency: number;
        };
    };
}

export interface CoreConfig {
    maxDepth: number;
    parallelTasks: boolean;
    contextWindow: number;
    branchingEnabled: boolean;
    revisionEnabled: boolean;
    confidenceThreshold: number;
    minConfidenceGrowth: number;  // Minimum confidence increase between thoughts
    minRevisionConfidence: number;  // Minimum confidence for revisions
}

export interface ThoughtMetrics {
    totalThoughts: number;  // Total number of thoughts processed
    averageProcessingTime: number;
    successRate: number;
    lastConfidence?: number;  // Last recorded confidence
    processingTimes: number[];
    resourceUsage: {
        memory: number;
        cpu: number;
    };
} 