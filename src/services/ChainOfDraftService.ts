import { DraftConfig, EnhancementConfig, DebugConfig, DraftData, DraftMetrics, ProcessingState, DraftContext, DraftCategory, draftDataSchema } from "../types/chainOfDraft.js";
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { sanitizeContext, getContextConfidence, hasContextContent, mergeContexts, logger } from '../utils/index.js';
import { EmbeddingUtil } from '../utils/EmbeddingUtil.js'; // Added Import
import { calculateRelevanceScore } from '../utils/SimilarityUtil.js'; // Added Import

/**
 * Service for managing Chain of Draft (CoD) operations.
 * Handles draft generation, critique, and revision processes with configurable settings.
 */
export class ChainOfDraftService {
    private readonly config: Required<DraftConfig>;
    private readonly enhancementConfig: Required<EnhancementConfig>;
    private readonly debugConfig: Required<DebugConfig>;
    private processingState: ProcessingState;
    private draftHistory: Map<number, DraftData>;
    private metricsCache: Map<string, number>;
    private lastProcessingTime: number;

    constructor(
        config: Partial<DraftConfig> = {},
        enhancementConfig: Partial<EnhancementConfig> = {},
        debugConfig: Partial<DebugConfig> = {}
    ) {
        const configManager = ConfigurationManager.getInstance();
        const defaultConfig = configManager.getDraftConfig();

        // Set configurations
        this.config = {
            ...defaultConfig,
            ...config
        };

        this.enhancementConfig = {
            enableSummarization: true,
            draftCategorization: true,
            progressTracking: true,
            dynamicAdaptation: true,
            ...enhancementConfig
        };

        this.debugConfig = {
            errorCapture: true,
            metricTracking: true,
            performanceMonitoring: true,
            ...debugConfig
        };

        this.processingState = this.initializeProcessingState();
        this.draftHistory = new Map();
        this.metricsCache = new Map();
        this.lastProcessingTime = 0;
    }

    /**
     * Process a draft input and return the processed result with optimized performance
     */
    public async processDraft(input: unknown): Promise<DraftData> { // Made async
        const startTime = Date.now();

        try {
            // Validate input against schema
            const validatedInput = draftDataSchema.parse(input);

            // Update processing state
            this.updateProcessingState('drafting');

            // Process the draft (now async)
            const processedDraft = await this.handleDraftProcessing(validatedInput); // Added await

            // Store in history and update cache
            this.draftHistory.set(processedDraft.draftNumber, processedDraft);
            this.updateMetricsCache(processedDraft);

            // Update metrics
            if (this.debugConfig.metricTracking) {
                this.lastProcessingTime = Date.now() - startTime;
                this.updateMetrics(startTime); // This method itself isn't async
            }

            return processedDraft;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Initialize the processing state with default values
     */
    private initializeProcessingState(): ProcessingState {
        // No changes needed
        return {
            currentPhase: 'initialization',
            activeThreads: 0,
            pendingRevisions: [],
            completedSteps: 0,
            estimatedRemainingSteps: 0,
            adaptationHistory: []
        };
    }

    /**
     * Update the current processing state
     */
    private updateProcessingState(phase: ProcessingState['currentPhase']): void {
        // No changes needed
        this.processingState.currentPhase = phase;
        this.processingState.completedSteps++;

        if (this.enhancementConfig.dynamicAdaptation) {
            this.adaptProcessing();
        }
    }

    /**
     * Handle the core draft processing logic with parallel operations
     */
    private async handleDraftProcessing(draft: DraftData): Promise<DraftData> { // Made async
        // If this is a revision, validate against original draft
        if (draft.isRevision && draft.revisesDraft) {
            const originalDraft = this.draftHistory.get(draft.revisesDraft);
            if (!originalDraft) {
                throw new Error(`Original draft ${draft.revisesDraft} not found`);
            }
            // processDraftRevision is now async
            return await this.processDraftRevision(draft, originalDraft); // Added await
        }

        // Process new draft (now async)
        const processedDraft = await this.processNewDraft(draft); // Added await

        // Validate confidence growth if not the first draft
        if (draft.draftNumber > 1) {
            const previousDraft = this.draftHistory.get(draft.draftNumber - 1);
            if (previousDraft?.confidence) {
                const minExpectedConfidence = previousDraft.confidence + this.config.minConfidenceGrowth;
                if (processedDraft.confidence && processedDraft.confidence < minExpectedConfidence) {
                    // Log this adjustment?
                    logger.debug(`Confidence adjusted for growth: ${processedDraft.confidence} -> ${minExpectedConfidence}`);
                    processedDraft.confidence = minExpectedConfidence;
                }
            }
        }

        // Ensure minimum confidence threshold
        if (processedDraft.confidence && processedDraft.confidence < this.config.confidenceThreshold) {
            logger.debug(`Confidence adjusted for threshold: ${processedDraft.confidence} -> ${this.config.confidenceThreshold}`);
            processedDraft.confidence = this.config.confidenceThreshold;
        }

        return processedDraft;
    }

    /**
     * Process a new draft with parallel operations where possible
     */
    private async processNewDraft(draft: DraftData): Promise<DraftData> { // Made async
        // Run parallel operations for performance-intensive calculations
        // calculateDraftConfidence is now async
        // categorize is now async
        const [confidence, metrics, category] = await Promise.all([
            this.calculateDraftConfidence(draft), // Added await
            this.generateMetrics(), // generateMetrics is sync
            this.enhancementConfig.draftCategorization ? this.categorize(draft) : undefined // Added await
        ]);

        // validateDraft is now async
        const needsRevision = !(await this.validateDraft(draft)); // Added await

        const processedDraft: DraftData = {
            ...draft,
            needsRevision: needsRevision,
            confidence,
            metrics,
            category
        };

        return processedDraft;
    }

    /**
     * Process a draft revision
     */
    private async processDraftRevision(draft: DraftData, originalDraft: DraftData): Promise<DraftData> { // Made async
        // calculateDraftConfidence is now async
        const confidence = await this.calculateDraftConfidence(draft); // Added await

        // Ensure revision maintains minimum confidence
        const minConfidence = Math.max(
            this.config.minRevisionConfidence,
            originalDraft.confidence || 0
        );

        // validateDraft is now async
        const needsRevision = !(await this.validateDraft(draft)); // Added await

        const processedDraft: DraftData = {
            ...draft,
            needsRevision: needsRevision,
            confidence: Math.max(confidence, minConfidence),
            metrics: this.generateMetrics(originalDraft.metrics) // generateMetrics is sync
        };

        // Storing in history happens in the caller (processDraft) now
        // this.draftHistory.set(processedDraft.draftNumber, processedDraft);
        return processedDraft;
    }

    /**
     * Generate metrics for the current draft
     */
    private generateMetrics(previousMetrics?: DraftMetrics): DraftMetrics {
        // No changes needed
        return {
            processingTime: Date.now(), // Or use performance.now()? Keep consistent
            resourceUsage: process.memoryUsage().heapUsed,
            dependencyChain: [], // How to build this? Needs context from caller?
            processingState: this.processingState
        };
    }

    /**
     * Calculate confidence score for a draft
     */
    // Made async because it calls async calculateContextRelevance
    private async calculateDraftConfidence(draft: DraftData): Promise<number> {
        if (!draft.content) {
            return 0.4; // Lower default confidence for empty content
        }

        // Determine content type
        const contentType = this.determineContentType(draft);

        // Calculate base quality score (structure, coherence, basic relevance)
        const qualityScore = this.calculateDraftQuality(draft); // Stays sync

        // Calculate semantic context relevance (NEW, async)
        const contextRelevanceScore = await this.calculateContextRelevance(draft); // Added await

        // Calculate creativity score for creative or hybrid content
        const creativityScore = this.calculateCreativityScore(draft); // Stays sync

        // Adjust weights based on content type - NOW INCLUDES CONTEXT RELEVANCE
        const weights = {
            technical: {
                quality: 0.35, // Reduced
                context: 0.30, // Added
                creativity: 0.05,
                revision: 0.15, // Reduced
                history: 0.10, // Reduced
                resource: 0.05 // Reduced
            },
            creative: {
                quality: 0.25, // Reduced
                context: 0.25, // Added
                creativity: 0.30, // Reduced
                revision: 0.10, // Reduced
                history: 0.05, // Reduced
                resource: 0.05 // Reduced
            },
            hybrid: {
                quality: 0.30, // Reduced
                context: 0.25, // Added
                creativity: 0.20, // Reduced
                revision: 0.10, // Reduced
                history: 0.05, // Reduced
                resource: 0.10
            }
        }[contentType];

        // Calculate revision impact if this is a revision
        const revisionScore = draft.isRevision ?
            this.calculateRevisionImpact(draft) : 0.7; // Stays sync

        // Calculate historical performance
        const historyScore = this.calculateHistoricalPerformance(); // Stays sync

        // Calculate resource efficiency
        const resourceScore = this.calculateResourceEfficiency({ // Stays sync
            processingTime: this.getAverageProcessingTime(),
            memoryUsage: process.memoryUsage().heapUsed
        });

        // Calculate weighted average with type-specific weights
        const confidence = (
            qualityScore * weights.quality +
            contextRelevanceScore * weights.context + // Use new score
            creativityScore * weights.creativity +
            revisionScore * weights.revision +
            historyScore * weights.history +
            resourceScore * weights.resource
        );

        // Store creativity score for future reference
        draft.creativityScore = creativityScore;

        // Apply dynamic threshold based on content type
        const baseThreshold = {
            technical: 0.55,
            creative: 0.45,
            hybrid: 0.50
        }[contentType];

        // Apply success rate adjustment with smoother curve
        const successRate = this.calculateSuccessRate(); // Stays sync
        const adjustedThreshold = baseThreshold * (0.85 + (successRate * 0.15));

        // Apply content-specific maximum confidence
        const maxConfidence = {
            technical: 0.95,
            creative: 0.90,
            hybrid: 0.92
        }[contentType];

        // Final confidence, clamped and thresholded
        return Math.max(adjustedThreshold, Math.min(maxConfidence, confidence));
    }

    /**
     * Determine the content type based on draft characteristics
     */
    private determineContentType(draft: DraftData): 'technical' | 'creative' | 'hybrid' {
        // No changes needed
        if (!draft.content) return 'technical';
        const content = draft.content.toLowerCase();
        const technicalPatterns = ['implement', 'system', 'architecture', 'database', 'algorithm', 'performance', 'optimization', 'protocol'];
        const creativePatterns = ['innovative', 'creative', 'design', 'novel', 'unique', 'intuitive', 'engaging', 'experience'];
        const technicalScore = technicalPatterns.reduce((score, pattern) => score + (content.includes(pattern) ? 1 : 0), 0) / technicalPatterns.length;
        const creativeScore = creativePatterns.reduce((score, pattern) => score + (content.includes(pattern) ? 1 : 0), 0) / creativePatterns.length;
        if (technicalScore > 0.3 && creativeScore > 0.3) return 'hybrid';
        if (creativeScore > technicalScore) return 'creative';
        return 'technical';
    }

    // REMOVED - Logic moved/adjusted within calculateDraftConfidence
    // private calculateWeights(...) { ... }

    // REMOVED - Logic moved/adjusted within calculateDraftConfidence
    // private calculateDynamicThreshold(...) { ... }

    // Modified: Removed context alignment calculation
    private calculateDraftQuality(draft: DraftData): number {
        const content = draft.content || '';

        // Content structure metrics (Was 30%)
        const hasStructure = content.includes('\n') || content.includes('.');
        const appropriateLength = content.length > 50 && content.length < 20000;
        const structureScore = (hasStructure ? 0.5 : 0) + (appropriateLength ? 0.5 : 0);

        // Content analysis metrics (Was 40%)
        const coherenceScore = this.analyzeDraftCoherence(content);
        // Relevance score based on critiqueFocus is removed as primary relevance is semantic now.
        // const relevanceScore = this.analyzeDraftRelevance(draft); // Removed call
        const analysisScore = coherenceScore; // analysisScore is now just coherenceScore

        // Context alignment (Was 30%) - REMOVED, handled by calculateContextRelevance now
        // const contextScore = this.calculateContextAlignment(draft);

        // Recalculate weights: Structure (50%), Analysis (Coherence only) (50%)
        return (
            structureScore * 0.5 +
            analysisScore * 0.5 // analysisScore is now just coherenceScore
            // contextScore * 0.3 // Removed
        );
    }

    private analyzeDraftCoherence(content: string): number {
        // No changes needed
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
        const lengthScore = Math.min(1, Math.max(0, 1 - Math.abs(100 - avgLength) / 100));
        const countScore = Math.min(1, sentences.length / 10);
        return (lengthScore + countScore) / 2;
    }

    // REMOVED - This method relied on extractContextKeywords which is gone.
    // Its purpose is superseded by the main calculateContextRelevance.
    // private analyzeDraftRelevance(draft: DraftData): number { ... }

    private calculateRevisionImpact(draft: DraftData): number {
        // No changes needed
        if (!draft.isRevision || !draft.revisesDraft || !draft.content) return 0.7;
        const originalDraft = this.draftHistory.get(draft.revisesDraft);
        if (!originalDraft || !originalDraft.content) return 0.7;
        const lengthDiff = Math.abs(draft.content.length - originalDraft.content.length);
        const lengthScore = Math.min(1, Math.max(0, 1 - lengthDiff / originalDraft.content.length));
        const similarityScore = this.calculateContentSimilarity(draft.content, originalDraft.content);
        const improvementScore = similarityScore < 0.9 ? 0.8 : 0.6;
        return (lengthScore * 0.3 + similarityScore * 0.3 + improvementScore * 0.4);
    }

    private calculateContentSimilarity(content1: string, content2: string): number {
        // No changes needed
        const words1 = new Set(content1.toLowerCase().split(/\s+/));
        const words2 = new Set(content2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }

    private calculateHistoricalPerformance(): number {
        // No changes needed
        if (this.draftHistory.size === 0) return 0.7;
        const recentDrafts = Array.from(this.draftHistory.values()).slice(-5);
        const successfulDrafts = recentDrafts.filter(d => !d.needsRevision).length;
        const successRate = successfulDrafts / recentDrafts.length;
        const trendBonus = this.calculatePerformanceTrend();
        return Math.min(1, successRate + trendBonus);
    }

    private calculatePerformanceTrend(): number {
        // No changes needed
        const recentDrafts = Array.from(this.draftHistory.values()).slice(-3);
        if (recentDrafts.length < 2) return 0;
        let improving = true;
        for (let i = 1; i < recentDrafts.length; i++) {
            if ((recentDrafts[i].needsRevision && !recentDrafts[i - 1].needsRevision) ||
                (recentDrafts[i].confidence || 0) < (recentDrafts[i - 1].confidence || 0)) {
                improving = false;
                break;
            }
        }
        return improving ? 0.1 : 0;
    }

    private calculateResourceEfficiency(metrics: { processingTime: number; memoryUsage: number }): number {
        // No changes needed
        const maxMemory = 1024 * 1024 * 200; // 200MB
        const targetTime = 2000; // 2s
        const memoryScore = 1 - (metrics.memoryUsage / maxMemory);
        const timeScore = 1 - (metrics.processingTime / targetTime);
        return Math.min(1, (memoryScore + timeScore) / 2);
    }

    private getAverageProcessingTime(): number {
        // No changes needed
        const cachedTime = this.getCachedMetric('avg_processing_time');
        if (cachedTime !== undefined && this.lastProcessingTime === 0) {
            return cachedTime;
        }
        const recentDrafts = Array.from(this.draftHistory.values()).slice(-5);
        const times = recentDrafts.map(d => d.metrics?.processingTime || 0).filter(t => t > 0);
        const avgTime = times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : this.lastProcessingTime;
        this.metricsCache.set('avg_processing_time', avgTime);
        return avgTime;
    }

    /**
     * Categorize a draft based on its content and context
     */
    // Made async because it calls async calculateDraftConfidence
    private async categorize(draft: DraftData): Promise<DraftCategory> { // Made async
        return {
            type: draft.isRevision ? 'revision' : 'initial',
            // calculateDraftConfidence is now async
            confidence: await this.calculateDraftConfidence(draft) // Added await
        };
    }

    /**
     * Adapt processing based on current state and metrics
     */
    private adaptProcessing(): void {
        // No changes needed
        const adaptation = {
            timestamp: Date.now(),
            adjustment: 'Optimizing processing parameters',
            reason: 'Dynamic adaptation based on current metrics'
        };
        this.processingState.adaptationHistory.push(adaptation);
    }

    /**
     * Handle errors during processing
     */
    private handleError(error: unknown): void {
        // No changes needed
        if (!this.debugConfig.errorCapture) return;
        const errorDetails = {
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : 'Unknown error',
            state: this.processingState
        };
        logger.error('Chain of Draft Error:', errorDetails);
    }

    /**
     * Update processing metrics
     */
    private updateMetrics(startTime: number): void {
        // No changes needed
        const processingTime = Date.now() - startTime;
        if (this.debugConfig.performanceMonitoring) {
            logger.debug('Processing metrics:', {
                time: processingTime,
                memory: process.memoryUsage(),
                state: this.processingState
            });
        }
    }

    // REMOVED - No longer needed, replaced by calculateContextRelevance
    // private extractContextKeywords(text: string): string[] { ... }

    // Made async because it calls async calculateDraftConfidence
    private async validateDraft(draft: DraftData): Promise<boolean> { // Made async
        if (!draft.content) return false;

        // Basic validation - minimum 50 characters for meaningful content
        if (draft.content.length < 50) {
            return false;
        }

        // Calculate confidence (now async)
        const confidence = await this.calculateDraftConfidence(draft); // Added await

        // Validate against minimum thresholds
        if (draft.isRevision) {
            return confidence >= this.config.minRevisionConfidence;
        }

        // For regular drafts, check confidence growth if not the first draft
        if (draft.draftNumber > 1) {
            const previousDraft = this.draftHistory.get(draft.draftNumber - 1);
            if (previousDraft?.confidence) {
                const minExpectedConfidence = previousDraft.confidence + this.config.minConfidenceGrowth;
                return confidence >= minExpectedConfidence;
            }
        }

        // For first draft or when previous draft not found
        return confidence >= this.config.confidenceThreshold;
    }

    // REMOVED - Replaced by calculateContextRelevance
    // private calculateContextAlignment(draft: DraftData): number { ... }

    private calculateSuccessRate(): number {
        // No changes needed
        if (this.draftHistory.size === 0) return 1;
        const recentDrafts = Array.from(this.draftHistory.values()).slice(-5);
        const successfulDrafts = recentDrafts.filter(d =>
            d.confidence !== undefined &&
            d.confidence >= this.config.confidenceThreshold
        ).length;
        return successfulDrafts / recentDrafts.length;
    }

    /**
     * Calculate creativity score based on content analysis
     */
    private calculateCreativityScore(draft: DraftData): number {
        // No changes needed
        const content = draft.content || '';
        const noveltyScore = this.assessNovelty(content);
        const flexibilityScore = this.assessFlexibility(content);
        const originalityScore = this.assessOriginality(content);
        return (noveltyScore + flexibilityScore + originalityScore) / 3;
    }

    /**
     * Assess novelty in content
     */
    private assessNovelty(content: string): number {
        // No changes needed
        const hasUniquePhrases = content.includes('novel') || content.includes('innovative') || content.includes('new approach');
        const hasStructuralVariety = /[.!?][^\w\s]*\s+[A-Z]/.test(content);
        const hasComplexStructures = content.includes('if') || content.includes('however') || content.includes('alternatively');
        return ((hasUniquePhrases ? 0.4 : 0) + (hasStructuralVariety ? 0.3 : 0) + (hasComplexStructures ? 0.3 : 0));
    }

    /**
     * Assess flexibility in content
     */
    private assessFlexibility(content: string): number {
        // No changes needed
        const perspectives = content.split(/(?:however|alternatively|on the other hand|in contrast)/i).length - 1;
        const hasMultipleApproaches = perspectives > 1;
        const hasComparisons = content.includes('compared to') || content.includes('versus') || content.includes('while');
        const hasConditionals = content.includes('if') || content.includes('when') || content.includes('depending');
        return ((hasMultipleApproaches ? 0.4 : 0) + (hasComparisons ? 0.3 : 0) + (hasConditionals ? 0.3 : 0));
    }

    /**
     * Assess originality in content
     */
    private assessOriginality(content: string): number {
        // No changes needed
        const hasCombinations = content.includes('combining') || content.includes('integrating') || content.includes('merging');
        const hasInnovation = content.includes('innovative') || content.includes('creative') || content.includes('unique');
        const hasUnconventional = content.includes('unconventional') || content.includes('alternative') || content.includes('novel');
        return ((hasCombinations ? 0.4 : 0) + (hasInnovation ? 0.3 : 0) + (hasUnconventional ? 0.3 : 0));
    }

    /**
     * Assess context complexity
     */
    private assessContextComplexity(context?: unknown): number {
        // No changes needed
        const sanitizedContext = sanitizeContext(context);
        if (!hasContextContent(sanitizedContext)) return 0.5;
        const hasAssumptions = sanitizedContext.assumptions && sanitizedContext.assumptions.length > 0;
        const hasConstraints = sanitizedContext.constraints && sanitizedContext.constraints.length > 0;
        const hasProblemScope = !!sanitizedContext.problemScope;
        const complexityFactors = [hasAssumptions ? 0.4 : 0, hasConstraints ? 0.3 : 0, hasProblemScope ? 0.3 : 0];
        return complexityFactors.reduce((sum, factor) => sum + factor, 0);
    }

    /**
     * Update metrics cache for faster subsequent calculations
     */
    private updateMetricsCache(draft: DraftData): void {
        // No changes needed
        const cacheKey = `draft_${draft.draftNumber}`;
        if (draft.confidence) {
            this.metricsCache.set(`${cacheKey}_confidence`, draft.confidence);
        }
        if (draft.metrics?.processingTime) {
            this.metricsCache.set(`${cacheKey}_processing_time`, draft.metrics.processingTime);
        }
        if (this.metricsCache.size > 100) {
            const oldestKey = Array.from(this.metricsCache.keys())[0];
            this.metricsCache.delete(oldestKey);
        }
    }

    /**
     * Get cached metric value if available
     */
    private getCachedMetric(key: string): number | undefined {
        // No changes needed
        return this.metricsCache.get(key);
    }

    // *** NEW METHOD ***
    private async calculateContextRelevance(draft: DraftData): Promise<number> {
        const outputText = draft.content || '';
        const context = draft.context || {}; // Assuming context object is attached

        // Assemble context strings (Mandatory parts from current context)
        const contextStrings = [
            context.problemScope,
            ...(context.constraints || []),
            ...(context.assumptions || []),
            // TODO: Add optional previous step text based on config flag
            // const configManager = ConfigurationManager.getInstance();
            // if (configManager.getDraftConfig().includePreviousStepTextInContext) { ... }
        ].filter((s): s is string => typeof s === 'string' && s.trim() !== '');

        // Add historical context? Maybe less relevant for CoD?
        // Let's stick to current context for now.

        if (!outputText || contextStrings.length === 0) {
            logger.warn('No output text or context strings for relevance calculation in CoD.');
            return 0.4; // Default low score
        }

        try {
            const embeddingUtil = EmbeddingUtil.getInstance();
            const targetEmbedding = await embeddingUtil.generateEmbedding(outputText);
            const contextEmbeddings = await embeddingUtil.generateEmbeddings(contextStrings);

            if (!targetEmbedding || !contextEmbeddings) {
                logger.error('Failed to generate embeddings for CoD relevance calculation.');
                return 0.3; // Return very low score on embedding failure
            }

            // Using the 'Max' strategy
            const relevanceScore = calculateRelevanceScore(targetEmbedding, contextEmbeddings);
            return relevanceScore;

        } catch (error) {
            logger.error('Error calculating semantic relevance in CoD:', error);
            return 0.3; // Return very low score on error
        }
    }
}
