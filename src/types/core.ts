export interface CoreConfig {
    maxDepth: number;
    parallelTasks: boolean;
    contextWindow: number;
    branchingEnabled: boolean;
    revisionEnabled: boolean;
    confidenceThreshold: number;
    minConfidenceGrowth: number;  // Minimum confidence increase between thoughts
    minRevisionConfidence: number;  // Minimum confidence for revisions
    embeddingModel?: string; // Optional: Name of the sentence transformer model for embeddings
    includePreviousStepTextInContext?: boolean; // Optional: Flag to include prior step text in relevance context
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
