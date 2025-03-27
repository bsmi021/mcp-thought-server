import { DraftConfig, EnhancementConfig, DebugConfig, DraftData, DraftMetrics, ProcessingState, DraftContext, DraftCategory, draftDataSchema } from "../types/chainOfDraft.js";
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { sanitizeContext, getContextConfidence, hasContextContent, mergeContexts, logger } from '../utils/index.js';

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
    public async processDraft(input: unknown): Promise<DraftData> {
        const startTime = Date.now();

        try {
            // Validate input against schema
            const validatedInput = draftDataSchema.parse(input);

            // Update processing state
            this.updateProcessingState('drafting');

            // Process the draft with parallel operations where possible
            const processedDraft = await this.handleDraftProcessing(validatedInput);

            // Store in history and update cache
            this.draftHistory.set(processedDraft.draftNumber, processedDraft);
            this.updateMetricsCache(processedDraft);

            // Update metrics
            if (this.debugConfig.metricTracking) {
                this.lastProcessingTime = Date.now() - startTime;
                this.updateMetrics(startTime);
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
        this.processingState.currentPhase = phase;
        this.processingState.completedSteps++;

        if (this.enhancementConfig.dynamicAdaptation) {
            this.adaptProcessing();
        }
    }

    /**
     * Handle the core draft processing logic with parallel operations
     */
    private async handleDraftProcessing(draft: DraftData): Promise<DraftData> {
        // If this is a revision, validate against original draft
        if (draft.isRevision && draft.revisesDraft) {
            const originalDraft = this.draftHistory.get(draft.revisesDraft);
            if (!originalDraft) {
                throw new Error(`Original draft ${draft.revisesDraft} not found`);
            }
            return this.processDraftRevision(draft, originalDraft);
        }

        // Process new draft with parallel operations
        const processedDraft = await this.processNewDraft(draft);

        // Validate confidence growth if not the first draft
        if (draft.draftNumber > 1) {
            const previousDraft = this.draftHistory.get(draft.draftNumber - 1);
            if (previousDraft?.confidence) {
                const minExpectedConfidence = previousDraft.confidence + this.config.minConfidenceGrowth;
                if (processedDraft.confidence && processedDraft.confidence < minExpectedConfidence) {
                    processedDraft.confidence = minExpectedConfidence;
                }
            }
        }

        // Ensure minimum confidence threshold
        if (processedDraft.confidence && processedDraft.confidence < this.config.confidenceThreshold) {
            processedDraft.confidence = this.config.confidenceThreshold;
        }

        return processedDraft;
    }

    /**
     * Process a new draft with parallel operations where possible
     */
    private async processNewDraft(draft: DraftData): Promise<DraftData> {
        // Run parallel operations for performance-intensive calculations
        const [confidence, metrics, category] = await Promise.all([
            this.calculateDraftConfidence(draft),
            this.generateMetrics(),
            this.enhancementConfig.draftCategorization ? this.categorize(draft) : undefined
        ]);

        const processedDraft: DraftData = {
            ...draft,
            needsRevision: !this.validateDraft(draft),
            confidence,
            metrics,
            category
        };

        return processedDraft;
    }

    /**
     * Process a draft revision
     */
    private async processDraftRevision(draft: DraftData, originalDraft: DraftData): Promise<DraftData> {
        const confidence = this.calculateDraftConfidence(draft);

        // Ensure revision maintains minimum confidence
        const minConfidence = Math.max(
            this.config.minRevisionConfidence,
            originalDraft.confidence || 0
        );

        const processedDraft: DraftData = {
            ...draft,
            needsRevision: !this.validateDraft(draft),
            confidence: Math.max(confidence, minConfidence),
            metrics: this.generateMetrics(originalDraft.metrics)
        };

        this.draftHistory.set(processedDraft.draftNumber, processedDraft);
        return processedDraft;
    }

    /**
     * Generate metrics for the current draft
     */
    private generateMetrics(previousMetrics?: DraftMetrics): DraftMetrics {
        return {
            processingTime: Date.now(),
            resourceUsage: process.memoryUsage().heapUsed,
            dependencyChain: [],
            processingState: this.processingState
        };
    }

    /**
     * Calculate confidence score for a draft
     */
    private calculateDraftConfidence(draft: DraftData): number {
        if (!draft.content) {
            return 0.4; // Lower default confidence for empty content
        }

        // Determine content type
        const contentType = this.determineContentType(draft);

        // Calculate base quality score (35% weight)
        const qualityScore = this.calculateDraftQuality(draft);

        // Calculate creativity score for creative or hybrid content
        const creativityScore = this.calculateCreativityScore(draft);

        // Adjust weights based on content type
        const weights = {
            technical: {
                quality: 0.45,
                creativity: 0.05,
                revision: 0.25,
                history: 0.15,
                resource: 0.10
            },
            creative: {
                quality: 0.30,
                creativity: 0.35,
                revision: 0.15,
                history: 0.10,
                resource: 0.10
            },
            hybrid: {
                quality: 0.35,
                creativity: 0.25,
                revision: 0.20,
                history: 0.10,
                resource: 0.10
            }
        }[contentType];

        // Calculate revision impact if this is a revision
        const revisionScore = draft.isRevision ?
            this.calculateRevisionImpact(draft) : 0.7;

        // Calculate historical performance
        const historyScore = this.calculateHistoricalPerformance();

        // Calculate resource efficiency
        const resourceScore = this.calculateResourceEfficiency({
            processingTime: this.getAverageProcessingTime(),
            memoryUsage: process.memoryUsage().heapUsed
        });

        // Calculate weighted average with type-specific weights
        const confidence = (
            qualityScore * weights.quality +
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
        const successRate = this.calculateSuccessRate();
        const adjustedThreshold = baseThreshold * (0.85 + (successRate * 0.15));

        // Apply content-specific maximum confidence
        const maxConfidence = {
            technical: 0.95,
            creative: 0.90,
            hybrid: 0.92
        }[contentType];

        return Math.max(adjustedThreshold, Math.min(maxConfidence, confidence));
    }

    /**
     * Determine the content type based on draft characteristics
     */
    private determineContentType(draft: DraftData): 'technical' | 'creative' | 'hybrid' {
        if (!draft.content) return 'technical';

        const content = draft.content.toLowerCase();

        // Technical indicators
        const technicalPatterns = [
            'implement', 'system', 'architecture', 'database',
            'algorithm', 'performance', 'optimization', 'protocol'
        ];

        // Creative indicators
        const creativePatterns = [
            'innovative', 'creative', 'design', 'novel',
            'unique', 'intuitive', 'engaging', 'experience'
        ];

        const technicalScore = technicalPatterns.reduce(
            (score, pattern) => score + (content.includes(pattern) ? 1 : 0), 0
        ) / technicalPatterns.length;

        const creativeScore = creativePatterns.reduce(
            (score, pattern) => score + (content.includes(pattern) ? 1 : 0), 0
        ) / creativePatterns.length;

        if (technicalScore > 0.3 && creativeScore > 0.3) return 'hybrid';
        if (creativeScore > technicalScore) return 'creative';
        return 'technical';
    }

    /**
     * Calculate weights based on content type
     */
    private calculateWeights(
        contentType: 'technical' | 'creative' | 'hybrid',
        baseWeights: Record<string, number>
    ): Record<string, number> {
        switch (contentType) {
            case 'creative':
                return {
                    ...baseWeights,
                    quality: baseWeights.quality * 0.9,
                    creativity: baseWeights.creativity * 1.2
                };
            case 'hybrid':
                return {
                    ...baseWeights,
                    quality: baseWeights.quality * 0.95,
                    creativity: baseWeights.creativity * 1.1
                };
            default:
                return baseWeights;
        }
    }

    /**
     * Calculate dynamic threshold based on content type and context
     */
    private calculateDynamicThreshold(
        draft: DraftData,
        contentType: 'technical' | 'creative' | 'hybrid'
    ): number {
        const baseThreshold = contentType === 'creative' ? 0.45 :
            contentType === 'hybrid' ? 0.5 : 0.55;

        // Adjust based on draft position
        const positionAdjustment = Math.min(0.1, (draft.draftNumber / draft.totalDrafts) * 0.2);

        // Adjust based on context quality
        const sanitizedContext = sanitizeContext(draft.context);
        const contextConfidence = getContextConfidence(sanitizedContext);
        const contextAdjustment = (1 - contextConfidence) * 0.1;

        return Math.max(0.4, Math.min(0.9,
            baseThreshold + positionAdjustment - contextAdjustment
        ));
    }

    private calculateDraftQuality(draft: DraftData): number {
        const content = draft.content || '';

        // Content structure metrics (30%)
        const hasStructure = content.includes('\n') || content.includes('.');
        const appropriateLength = content.length > 50 && content.length < 20000;
        const structureScore = (hasStructure ? 0.5 : 0) + (appropriateLength ? 0.5 : 0);

        // Content analysis metrics (40%)
        const coherenceScore = this.analyzeDraftCoherence(content);
        const relevanceScore = this.analyzeDraftRelevance(draft);
        const analysisScore = (coherenceScore + relevanceScore) / 2;

        // Context alignment (30%)
        const contextScore = this.calculateContextAlignment(draft);

        // Weighted combination
        return (
            structureScore * 0.3 +
            analysisScore * 0.4 +
            contextScore * 0.3
        );
    }

    private analyzeDraftCoherence(content: string): number {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

        // Score based on optimal sentence length and count
        const lengthScore = Math.min(1, Math.max(0, 1 - Math.abs(100 - avgLength) / 100));
        const countScore = Math.min(1, sentences.length / 10);

        return (lengthScore + countScore) / 2;
    }

    private analyzeDraftRelevance(draft: DraftData): number {
        if (!draft.critiqueFocus || !draft.content) return 0.7;

        const keywords = this.extractContextKeywords(draft.critiqueFocus);
        const contentKeywords = this.extractContextKeywords(draft.content);

        const matches = contentKeywords.filter(word =>
            keywords.some(keyword => word.includes(keyword))
        ).length;

        return Math.min(1, matches / Math.max(1, keywords.length));
    }

    private calculateRevisionImpact(draft: DraftData): number {
        if (!draft.isRevision || !draft.revisesDraft || !draft.content) return 0.7;

        const originalDraft = this.draftHistory.get(draft.revisesDraft);
        if (!originalDraft || !originalDraft.content) return 0.7;

        // Compare lengths
        const lengthDiff = Math.abs(draft.content.length - originalDraft.content.length);
        const lengthScore = Math.min(1, Math.max(0, 1 - lengthDiff / originalDraft.content.length));

        // Compare content similarity
        const similarityScore = this.calculateContentSimilarity(draft.content, originalDraft.content);

        // Calculate improvement score
        const improvementScore = similarityScore < 0.9 ? 0.8 : 0.6; // Reward significant changes

        return (lengthScore * 0.3 + similarityScore * 0.3 + improvementScore * 0.4);
    }

    private calculateContentSimilarity(content1: string, content2: string): number {
        const words1 = new Set(content1.toLowerCase().split(/\s+/));
        const words2 = new Set(content2.toLowerCase().split(/\s+/));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    private calculateHistoricalPerformance(): number {
        if (this.draftHistory.size === 0) return 0.7;

        const recentDrafts = Array.from(this.draftHistory.values())
            .slice(-5); // Look at last 5 drafts

        const successfulDrafts = recentDrafts.filter(d => !d.needsRevision).length;
        const successRate = successfulDrafts / recentDrafts.length;

        // Add trend bonus if performance is improving
        const trendBonus = this.calculatePerformanceTrend();

        return Math.min(1, successRate + trendBonus);
    }

    private calculatePerformanceTrend(): number {
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
        const maxMemory = 1024 * 1024 * 200; // 200MB
        const targetTime = 2000; // 2s

        const memoryScore = 1 - (metrics.memoryUsage / maxMemory);
        const timeScore = 1 - (metrics.processingTime / targetTime);

        return Math.min(1, (memoryScore + timeScore) / 2);
    }

    /**
     * Get average processing time from draft history
     */
    private getAverageProcessingTime(): number {
        const cachedTime = this.getCachedMetric('avg_processing_time');
        if (cachedTime !== undefined && this.lastProcessingTime === 0) {
            return cachedTime;
        }

        const recentDrafts = Array.from(this.draftHistory.values()).slice(-5);
        const times = recentDrafts
            .map(d => d.metrics?.processingTime || 0)
            .filter(t => t > 0);

        const avgTime = times.length > 0
            ? times.reduce((sum, time) => sum + time, 0) / times.length
            : this.lastProcessingTime;

        this.metricsCache.set('avg_processing_time', avgTime);
        return avgTime;
    }

    /**
     * Categorize a draft based on its content and context
     */
    private categorize(draft: DraftData): DraftCategory {
        return {
            type: draft.isRevision ? 'revision' : 'initial',
            confidence: this.calculateDraftConfidence(draft)
        };
    }

    /**
     * Adapt processing based on current state and metrics
     */
    private adaptProcessing(): void {
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
        if (!this.debugConfig.errorCapture) return;

        const errorDetails = {
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : 'Unknown error',
            state: this.processingState
        };

        // In a real implementation, you might want to log this to a proper error tracking system
        logger.error('Chain of Draft Error:', errorDetails);
    }

    /**
     * Update processing metrics
     */
    private updateMetrics(startTime: number): void {
        const processingTime = Date.now() - startTime;

        if (this.debugConfig.performanceMonitoring) {
            // In a real implementation, you might want to store these metrics
            // in a proper monitoring system
            logger.debug('Processing metrics:', {
                time: processingTime,
                memory: process.memoryUsage(),
                state: this.processingState
            });
        }
    }

    /**
     * Extract keywords from text for context matching
     * @param text The text to extract keywords from
     * @returns Array of keywords
     */
    private extractContextKeywords(text: string): string[] {
        return text
            .toLowerCase()
            .split(/[\s,.!?]+/)
            .filter((word: string) => word.length > 3) // Filter out short words
            .slice(0, 10); // Limit to top 10 keywords
    }

    private async validateDraft(draft: DraftData): Promise<boolean> {
        if (!draft.content) return false;

        // Basic validation - minimum 50 characters for meaningful content
        if (draft.content.length < 50) {
            return false;
        }

        // Calculate confidence
        const confidence = this.calculateDraftConfidence(draft);

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

    private calculateContextAlignment(draft: DraftData): number {
        if (!draft.content) return 0.5;

        // Extract keywords from current content
        const contentKeywords = this.extractContextKeywords(draft.content);

        // Get historical context
        const historicalContexts = Array.from(this.draftHistory.values())
            .slice(-3)
            .map(d => d.context)
            .filter(Boolean);

        // Merge and sanitize historical contexts
        const mergedContext = mergeContexts(historicalContexts.map(ctx => sanitizeContext(ctx)));

        // Calculate alignment score based on merged context
        const contextKeywords = [
            mergedContext.problemScope,
            ...(mergedContext.assumptions || []),
            ...(mergedContext.constraints || [])
        ].filter((k): k is string => typeof k === 'string' && k.length > 0);

        const matches = contentKeywords.filter(word =>
            contextKeywords.some(k => word.toLowerCase().includes(k.toLowerCase()))
        ).length;

        return Math.min(1, matches / Math.max(1, contextKeywords.length));
    }

    private calculateSuccessRate(): number {
        if (this.draftHistory.size === 0) return 1;

        const recentDrafts = Array.from(this.draftHistory.values())
            .slice(-5); // Look at last 5 drafts

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
        const content = draft.content || '';

        // Novelty assessment (unique patterns and approaches)
        const noveltyScore = this.assessNovelty(content);

        // Flexibility (different perspectives/solutions)
        const flexibilityScore = this.assessFlexibility(content);

        // Originality (unique combinations of ideas)
        const originalityScore = this.assessOriginality(content);

        return (noveltyScore + flexibilityScore + originalityScore) / 3;
    }

    /**
     * Assess novelty in content
     */
    private assessNovelty(content: string): number {
        // Implement pattern recognition for unique approaches
        const hasUniquePhrases = content.includes('novel') ||
            content.includes('innovative') ||
            content.includes('new approach');

        const hasStructuralVariety = /[.!?][^\w\s]*\s+[A-Z]/.test(content);
        const hasComplexStructures = content.includes('if') ||
            content.includes('however') ||
            content.includes('alternatively');

        return (
            (hasUniquePhrases ? 0.4 : 0) +
            (hasStructuralVariety ? 0.3 : 0) +
            (hasComplexStructures ? 0.3 : 0)
        );
    }

    /**
     * Assess flexibility in content
     */
    private assessFlexibility(content: string): number {
        // Check for multiple perspectives/approaches
        const perspectives = content.split(/(?:however|alternatively|on the other hand|in contrast)/i).length - 1;
        const hasMultipleApproaches = perspectives > 1;

        // Check for comparative analysis
        const hasComparisons = content.includes('compared to') ||
            content.includes('versus') ||
            content.includes('while');

        // Check for conditional statements
        const hasConditionals = content.includes('if') ||
            content.includes('when') ||
            content.includes('depending');

        return (
            (hasMultipleApproaches ? 0.4 : 0) +
            (hasComparisons ? 0.3 : 0) +
            (hasConditionals ? 0.3 : 0)
        );
    }

    /**
     * Assess originality in content
     */
    private assessOriginality(content: string): number {
        // Check for unique combinations of ideas
        const hasCombinations = content.includes('combining') ||
            content.includes('integrating') ||
            content.includes('merging');

        // Check for innovative solutions
        const hasInnovation = content.includes('innovative') ||
            content.includes('creative') ||
            content.includes('unique');

        // Check for out-of-box thinking
        const hasUnconventional = content.includes('unconventional') ||
            content.includes('alternative') ||
            content.includes('novel');

        return (
            (hasCombinations ? 0.4 : 0) +
            (hasInnovation ? 0.3 : 0) +
            (hasUnconventional ? 0.3 : 0)
        );
    }

    /**
     * Assess context complexity
     */
    private assessContextComplexity(context?: unknown): number {
        const sanitizedContext = sanitizeContext(context);
        if (!hasContextContent(sanitizedContext)) return 0.5;

        const hasAssumptions = sanitizedContext.assumptions && sanitizedContext.assumptions.length > 0;
        const hasConstraints = sanitizedContext.constraints && sanitizedContext.constraints.length > 0;
        const hasProblemScope = !!sanitizedContext.problemScope;

        const complexityFactors = [
            hasAssumptions ? 0.4 : 0,
            hasConstraints ? 0.3 : 0,
            hasProblemScope ? 0.3 : 0
        ];

        return complexityFactors.reduce((sum, factor) => sum + factor, 0);
    }

    /**
     * Update metrics cache for faster subsequent calculations
     */
    private updateMetricsCache(draft: DraftData): void {
        const cacheKey = `draft_${draft.draftNumber}`;

        if (draft.confidence) {
            this.metricsCache.set(`${cacheKey}_confidence`, draft.confidence);
        }

        if (draft.metrics?.processingTime) {
            this.metricsCache.set(`${cacheKey}_processing_time`, draft.metrics.processingTime);
        }

        // Cleanup old cache entries
        if (this.metricsCache.size > 100) {
            const oldestKey = Array.from(this.metricsCache.keys())[0];
            this.metricsCache.delete(oldestKey);
        }
    }

    /**
     * Get cached metric value if available
     */
    private getCachedMetric(key: string): number | undefined {
        return this.metricsCache.get(key);
    }
} 