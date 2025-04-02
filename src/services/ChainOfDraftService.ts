import { DraftConfig, EnhancementConfig, DebugConfig, DraftData, DraftMetrics, ProcessingState, DraftContext, DraftCategory, draftDataSchema } from "../types/chainOfDraft.js";
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { sanitizeContext, getContextConfidence, hasContextContent, mergeContexts, logger } from '../utils/index.js';
import { EmbeddingUtil } from '../utils/EmbeddingUtil.js';
import { calculateRelevanceScore } from '../utils/SimilarityUtil.js';
import { CoherenceCheckerUtil } from '../utils/CoherenceCheckerUtil.js';
import { StorageService } from './StorageService.js';

/**
 * Service for managing Chain of Draft (CoD) operations.
 * Handles draft generation, critique, and revision processes with configurable settings.
 * Uses StorageService for draft persistence.
 */
export class ChainOfDraftService {
    private readonly config: Required<DraftConfig>;
    private readonly enhancementConfig: Required<EnhancementConfig>;
    private readonly debugConfig: Required<DebugConfig>;
    private processingState: ProcessingState;
    private metricsCache: Map<string, number>;
    private lastProcessingTime: number;
    private storageService: StorageService;

    constructor(
        storageService: StorageService,
        config: Partial<DraftConfig> = {},
        enhancementConfig: Partial<EnhancementConfig> = {},
        debugConfig: Partial<DebugConfig> = {}
    ) {
        this.storageService = storageService;
        const configManager = ConfigurationManager.getInstance();
        const defaultConfig = configManager.getDraftConfig();
        this.config = { ...defaultConfig, ...config };
        this.enhancementConfig = { enableSummarization: true, draftCategorization: true, progressTracking: true, dynamicAdaptation: true, ...enhancementConfig };
        this.debugConfig = { errorCapture: true, metricTracking: true, performanceMonitoring: true, ...debugConfig };
        this.processingState = this.initializeProcessingState();
        this.metricsCache = new Map();
        this.lastProcessingTime = 0;
    }

    public async processDraft(input: unknown, sessionId: string): Promise<DraftData> {
        const draftInput = input as Partial<DraftData>;
        // CHANGE 1: logger.debug with context
        logger.debug('processDraft ENTRY', {
            sessionId: sessionId,
            draftNumber: draftInput.draftNumber,
            isRevision: draftInput.isRevision,
            revisesDraft: draftInput.revisesDraft
        });

        const startTime = Date.now();
        try {
            const validatedInput = draftDataSchema.parse(input);
            this.updateProcessingState('drafting');
            const processedDraft = await this.handleDraftProcessing(validatedInput, sessionId);
            await this.storageService.setDraft(sessionId, processedDraft);
            // CHANGE 2: logger.debug with context
            logger.debug('Draft saved via StorageService', { sessionId, draftNumber: processedDraft.draftNumber });
            this.updateMetricsCache(processedDraft);
            if (this.debugConfig.metricTracking) {
                this.lastProcessingTime = Date.now() - startTime;
                this.updateMetrics(startTime);
            }
            // CHANGE 3: logger.info with context
            logger.info('Processing complete', { sessionId });
            return processedDraft;
        } catch (error) {
            // CHANGE 4: logger.error with error and context
            logger.error('Error during processing', error, { sessionId });
            this.handleError(error);
            throw error;
        }
    }

    private initializeProcessingState(): ProcessingState {
        return {
            currentPhase: 'initialization', activeThreads: 0, pendingRevisions: [],
            completedSteps: 0, estimatedRemainingSteps: 0, adaptationHistory: []
        };
    }

    private updateProcessingState(phase: ProcessingState['currentPhase']): void {
        this.processingState.currentPhase = phase;
        this.processingState.completedSteps++;
        if (this.enhancementConfig.dynamicAdaptation) this.adaptProcessing();
    }

    private async handleDraftProcessing(draft: DraftData, sessionId: string): Promise<DraftData> {
        let processedDraft: DraftData;
        if (draft.isRevision && draft.revisesDraft) {
            const targetDraftNum = draft.revisesDraft;
            // CHANGE 5: logger.debug with context
            logger.debug('handleDraftProcessing: Is revision, attempting to get original draft via StorageService', { sessionId, targetDraftNum });
            const originalDraft = await this.storageService.getDraft(sessionId, targetDraftNum);
            // CHANGE 6: logger.debug with context
            logger.debug('handleDraftProcessing: Result of get draft', { sessionId, targetDraftNum, found: !!originalDraft });
            if (!originalDraft) throw new Error(`[${sessionId}] Original draft ${targetDraftNum} not found in storage for this session.`);
            processedDraft = await this.processDraftRevision(draft, originalDraft, sessionId);
        } else {
            processedDraft = await this.processNewDraft(draft, sessionId);
        }

        if (draft.draftNumber > 1) {
            const previousDraft = await this.storageService.getDraft(sessionId, draft.draftNumber - 1);
            if (previousDraft?.confidence) {
                const minExpectedConfidence = previousDraft.confidence + this.config.minConfidenceGrowth;
                if (processedDraft.confidence && processedDraft.confidence < minExpectedConfidence) {
                    // CHANGE 7: logger.debug with context
                    logger.debug('Confidence adjusted for growth', { sessionId, oldConfidence: processedDraft.confidence, newConfidence: minExpectedConfidence });
                    processedDraft.confidence = minExpectedConfidence;
                }
            }
        }
        if (processedDraft.confidence && processedDraft.confidence < this.config.confidenceThreshold) {
            // CHANGE 8: logger.debug with context
            logger.debug('Confidence adjusted for threshold', { sessionId, oldConfidence: processedDraft.confidence, newConfidence: this.config.confidenceThreshold });
            processedDraft.confidence = this.config.confidenceThreshold;
        }
        return processedDraft;
    }

    private async processNewDraft(draft: DraftData, sessionId: string): Promise<DraftData> {
        const [confidence, metrics, category] = await Promise.all([
            this.calculateDraftConfidence(draft, sessionId),
            this.generateMetrics(),
            this.enhancementConfig.draftCategorization ? this.categorize(draft, sessionId) : undefined
        ]);
        const needsRevision = !(await this.validateDraft(draft, sessionId));
        const finalCategory = category ?? { type: 'initial', confidence: confidence ?? 0.5 };
        return { ...draft, needsRevision, confidence, metrics, category: finalCategory };
    }

    private async processDraftRevision(draft: DraftData, originalDraft: DraftData, sessionId: string): Promise<DraftData> {
        const confidence = await this.calculateDraftConfidence(draft, sessionId);
        const minConfidence = Math.max(this.config.minRevisionConfidence, originalDraft.confidence || 0);
        const needsRevision = !(await this.validateDraft(draft, sessionId));
        const category = (await this.categorize(draft, sessionId)) ?? { type: 'revision', confidence: Math.max(confidence, minConfidence) };
        return { ...draft, needsRevision, confidence: Math.max(confidence, minConfidence), metrics: this.generateMetrics(originalDraft.metrics), category };
    }

    private generateMetrics(previousMetrics?: DraftMetrics): DraftMetrics {
        return {
            processingTime: Date.now(), resourceUsage: process.memoryUsage().heapUsed,
            dependencyChain: [], processingState: this.processingState
        };
    }

    private async calculateDraftConfidence(draft: DraftData, sessionId: string): Promise<number> {
        if (!draft.content) return 0.4;
        const contentType = this.determineContentType(draft);
        const qualityScore = await this.calculateDraftQuality(draft);
        const contextRelevanceScore = await this.calculateContextRelevance(draft);
        const creativityScore = this.calculateCreativityScore(draft);
        const weights = {
            technical: { quality: 0.35, context: 0.30, creativity: 0.05, revision: 0.15, history: 0.10, resource: 0.05 },
            creative: { quality: 0.25, context: 0.25, creativity: 0.30, revision: 0.10, history: 0.05, resource: 0.05 },
            hybrid: { quality: 0.30, context: 0.25, creativity: 0.20, revision: 0.10, history: 0.05, resource: 0.10 }
        }[contentType];

        let originalDraftForRevision: DraftData | undefined;
        if (draft.isRevision && draft.revisesDraft) {
            originalDraftForRevision = await this.storageService.getDraft(sessionId, draft.revisesDraft);
        }
        const revisionScore = draft.isRevision ? this.calculateRevisionImpact(draft, originalDraftForRevision) : 0.7;

        // +++ Restore History Calculation using StorageService +++
        const recentDrafts = await this.storageService.getRecentDrafts(sessionId, 5);
        const historyScore = this.calculateHistoricalPerformance(sessionId, recentDrafts); // Pass fetched drafts

        const resourceScore = this.calculateResourceEfficiency({
            processingTime: this.getAverageProcessingTime(recentDrafts), // Pass fetched drafts
            memoryUsage: process.memoryUsage().heapUsed
        });

        const confidence = (
            qualityScore * weights.quality + contextRelevanceScore * weights.context +
            creativityScore * weights.creativity + revisionScore * weights.revision +
            historyScore * weights.history + resourceScore * weights.resource
        );
        draft.creativityScore = creativityScore;

        const baseThreshold = { technical: 0.55, creative: 0.45, hybrid: 0.50 }[contentType];
        // +++ Restore Success Rate Calculation +++
        const successRate = this.calculateSuccessRate(sessionId, recentDrafts); // Pass fetched drafts
        const adjustedThreshold = baseThreshold * (0.85 + (successRate * 0.15));
        const maxConfidence = { technical: 0.95, creative: 0.90, hybrid: 0.92 }[contentType];
        const finalConfidence = Math.max(adjustedThreshold, Math.min(maxConfidence, confidence));
        return isNaN(finalConfidence) ? baseThreshold : finalConfidence;
    }

    private determineContentType(draft: DraftData): 'technical' | 'creative' | 'hybrid' {
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

    private async calculateDraftQuality(draft: DraftData): Promise<number> {
        const content = draft.content || '';
        const hasStructure = content.includes('\n') || content.includes('.');
        const appropriateLength = content.length > 50 && content.length < 20000;
        const structureScore = (hasStructure ? 0.5 : 0) + (appropriateLength ? 0.5 : 0);
        const coherenceScore = await CoherenceCheckerUtil.getInstance().checkCoherence(content || '');
        const result = (structureScore * 0.5 + coherenceScore * 0.5);
        return isNaN(result) ? 0.5 : result;
    }

    private calculateRevisionImpact(draft: DraftData, originalDraft?: DraftData): number {
        if (!draft.isRevision || !draft.revisesDraft || !draft.content || !originalDraft || !originalDraft.content) return 0.7;
        const lengthDiff = Math.abs(draft.content.length - originalDraft.content.length);
        const lengthScore = Math.min(1, Math.max(0, 1 - (lengthDiff / (originalDraft.content.length || 1))));
        const similarityScore = this.calculateContentSimilarity(draft.content, originalDraft.content);
        const improvementScore = similarityScore < 0.9 ? 0.8 : 0.6;
        const result = (lengthScore * 0.3 + similarityScore * 0.3 + improvementScore * 0.4);
        return isNaN(result) ? 0.7 : result;
    }

    private calculateContentSimilarity(content1: string, content2: string): number {
        const words1 = new Set(content1.toLowerCase().split(/\s+/));
        const words2 = new Set(content2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        const result = union.size === 0 ? 1 : intersection.size / union.size;
        return isNaN(result) ? 0.5 : result;
    }

    // +++ Updated to use fetched recent drafts +++
    private calculateHistoricalPerformance(sessionId: string, recentDrafts: DraftData[]): number {
        if (recentDrafts.length === 0) return 0.7;
        const successfulDrafts = recentDrafts.filter(d => !d.needsRevision).length;
        const successRate = successfulDrafts / recentDrafts.length;
        const trendBonus = this.calculatePerformanceTrend(recentDrafts); // Pass fetched drafts
        const result = Math.min(1, successRate + trendBonus);
        return isNaN(result) ? 0.7 : result;
    }

    // +++ Un-simplified +++
    private calculatePerformanceTrend(recentDrafts: DraftData[]): number {
        if (recentDrafts.length < 2) return 0;
        let improving = true;
        // Ensure drafts are sorted correctly if needed (getRecentDrafts sorts DESC)
        const sortedDrafts = [...recentDrafts].sort((a, b) => a.draftNumber - b.draftNumber);
        for (let i = 1; i < sortedDrafts.length; i++) {
            if ((sortedDrafts[i].needsRevision && !sortedDrafts[i - 1].needsRevision) ||
                (sortedDrafts[i].confidence || 0) < (sortedDrafts[i - 1].confidence || 0)) {
                improving = false;
                break;
            }
        }
        return improving ? 0.1 : 0;
    }

    private calculateResourceEfficiency(metrics: { processingTime: number; memoryUsage: number }): number {
        const maxMemory = 1024 * 1024 * 200;
        const targetTime = 2000;
        const memoryUsage = metrics.memoryUsage > 0 ? metrics.memoryUsage : 1;
        const processingTime = metrics.processingTime > 0 ? metrics.processingTime : 1;
        const memoryScore = Math.max(0, 1 - (memoryUsage / maxMemory));
        const timeScore = Math.max(0, 1 - (processingTime / targetTime));
        const result = (memoryScore + timeScore) / 2;
        return isNaN(result) ? 0.5 : Math.max(0, Math.min(1, result));
    }

    // +++ Updated to use fetched recent drafts +++
    private getAverageProcessingTime(recentDrafts: DraftData[]): number {
        const cachedTime = this.getCachedMetric('avg_processing_time');
        if (cachedTime !== undefined && this.lastProcessingTime === 0) return cachedTime;

        const times = recentDrafts.map(d => d.metrics?.processingTime || 0).filter(t => t > 0);
        const avgTime = times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : this.lastProcessingTime;
        this.metricsCache.set('avg_processing_time', avgTime); // Update instance cache
        return avgTime > 0 ? avgTime : 1000; // Ensure positive return
    }

    private async categorize(draft: DraftData, sessionId: string): Promise<DraftCategory> {
        const confidence = await this.calculateDraftConfidence(draft, sessionId);
        return { type: draft.isRevision ? 'revision' : 'initial', confidence: confidence };
    }

    private adaptProcessing(): void {
        const adaptation = { timestamp: Date.now(), adjustment: 'Optimizing processing parameters (instance-level)', reason: 'Dynamic adaptation based on current instance metrics' };
        this.processingState.adaptationHistory.push(adaptation);
    }

    private handleError(error: unknown): void {
        if (!this.debugConfig.errorCapture) return;
        const errorDetails = { timestamp: Date.now(), error: error instanceof Error ? error.message : 'Unknown error', state: this.processingState };
        // CHANGE 9: logger.error with error object and context
        logger.error('Chain of Draft Error', error, { errorDetails });
    }

    private updateMetrics(startTime: number): void {
        const processingTime = Date.now() - startTime;
        if (this.debugConfig.performanceMonitoring) {
            // CHANGE 10: logger.debug with context, removed colon
            logger.debug('Instance Processing metrics', { time: processingTime, memory: process.memoryUsage(), state: this.processingState });
        }
    }

    private async validateDraft(draft: DraftData, sessionId: string): Promise<boolean> {
        if (!draft.content || draft.content.length < 50) return false;
        const confidence = await this.calculateDraftConfidence(draft, sessionId);
        if (draft.isRevision) return confidence >= this.config.minRevisionConfidence;
        if (draft.draftNumber > 1) {
            const previousDraft = await this.storageService.getDraft(sessionId, draft.draftNumber - 1);
            if (previousDraft?.confidence) {
                const minExpectedConfidence = previousDraft.confidence + this.config.minConfidenceGrowth;
                return confidence >= minExpectedConfidence;
            }
        }
        return confidence >= this.config.confidenceThreshold;
    }

    private calculateCreativityScore(draft: DraftData): number {
        const content = draft.content || '';
        const noveltyScore = this.assessNovelty(content);
        const flexibilityScore = this.assessFlexibility(content);
        const originalityScore = this.assessOriginality(content);
        const result = (noveltyScore + flexibilityScore + originalityScore) / 3;
        return isNaN(result) ? 0.5 : result;
    }

    private assessNovelty(content: string): number {
        const hasUniquePhrases = content.includes('novel') || content.includes('innovative') || content.includes('new approach');
        const hasStructuralVariety = /[.!?][^\w\s]*\s+[A-Z]/.test(content);
        const hasComplexStructures = content.includes('if') || content.includes('however') || content.includes('alternatively');
        return ((hasUniquePhrases ? 0.4 : 0) + (hasStructuralVariety ? 0.3 : 0) + (hasComplexStructures ? 0.3 : 0));
    }

    private assessFlexibility(content: string): number {
        const perspectives = content.split(/(?:however|alternatively|on the other hand|in contrast)/i).length - 1;
        const hasMultipleApproaches = perspectives > 1;
        const hasComparisons = content.includes('compared to') || content.includes('versus') || content.includes('while');
        const hasConditionals = content.includes('if') || content.includes('when') || content.includes('depending');
        return ((hasMultipleApproaches ? 0.4 : 0) + (hasComparisons ? 0.3 : 0) + (hasConditionals ? 0.3 : 0));
    }

    private assessOriginality(content: string): number {
        const hasCombinations = content.includes('combining') || content.includes('integrating') || content.includes('merging');
        const hasInnovation = content.includes('innovative') || content.includes('creative') || content.includes('unique');
        const hasUnconventional = content.includes('unconventional') || content.includes('alternative') || content.includes('novel');
        return ((hasCombinations ? 0.4 : 0) + (hasInnovation ? 0.3 : 0) + (hasUnconventional ? 0.3 : 0));
    }

    private assessContextComplexity(context?: unknown): number {
        const sanitizedContext = sanitizeContext(context);
        if (!hasContextContent(sanitizedContext)) return 0.5;
        const hasAssumptions = sanitizedContext.assumptions && sanitizedContext.assumptions.length > 0;
        const hasConstraints = sanitizedContext.constraints && sanitizedContext.constraints.length > 0;
        const hasProblemScope = !!sanitizedContext.problemScope;
        const complexityFactors = [hasAssumptions ? 0.4 : 0, hasConstraints ? 0.3 : 0, hasProblemScope ? 0.3 : 0];
        const result = complexityFactors.reduce((sum, factor) => sum + factor, 0);
        return isNaN(result) ? 0.5 : result;
    }

    private updateMetricsCache(draft: DraftData): void {
        const cacheKey = `draft_${draft.draftNumber}`;
        if (draft.confidence) this.metricsCache.set(`${cacheKey}_confidence`, draft.confidence);
        if (draft.metrics?.processingTime) this.metricsCache.set(`${cacheKey}_processing_time`, draft.metrics.processingTime);
        if (this.metricsCache.size > 100) {
            const oldestKey = Array.from(this.metricsCache.keys())[0];
            this.metricsCache.delete(oldestKey);
        }
    }

    private getCachedMetric(key: string): number | undefined {
        return this.metricsCache.get(key);
    }

    private async calculateContextRelevance(draft: DraftData): Promise<number> {
        const outputText = draft.content || '';
        const context = draft.context || {};
        const contextStrings = [context.problemScope, ...(context.constraints || []), ...(context.assumptions || [])]
            .filter((s): s is string => typeof s === 'string' && s.trim() !== '');
        // CHANGE 11: logger.debug with context, removed colon
        logger.debug('CoD calculateContextRelevance received', { hasOutputText: !!outputText, contextObject: context, contextStringsCalculated: contextStrings });
        if (!outputText || contextStrings.length === 0) {
            // CHANGE 12: logger.warn without context
            logger.warn('No output text or context strings for relevance calculation in CoD.');
            return 0.4;
        }
        try {
            const embeddingUtil = EmbeddingUtil.getInstance();
            const targetEmbedding = await embeddingUtil.generateEmbedding(outputText);
            const contextEmbeddings = await embeddingUtil.generateEmbeddings(contextStrings);
            if (!targetEmbedding || !contextEmbeddings) {
                // CHANGE 13: logger.error without error object
                logger.error('Failed to generate embeddings for CoD relevance calculation.');
                return 0.3;
            }
            const relevanceScore = calculateRelevanceScore(targetEmbedding, contextEmbeddings);
            return isNaN(relevanceScore) ? 0.4 : relevanceScore;
        } catch (error) {
            // CHANGE 14: logger.error with error object
            logger.error('Error calculating semantic relevance in CoD', error);
            return 0.3;
        }
    }

    // +++ Updated to use fetched recent drafts +++
    private calculateSuccessRate(sessionId: string, recentDrafts: DraftData[]): number {
        if (recentDrafts.length === 0) return 1; // Assume success if no history yet
        const successfulDrafts = recentDrafts.filter(d =>
            d.confidence !== undefined &&
            d.confidence >= this.config.confidenceThreshold
        ).length;
        const result = successfulDrafts / recentDrafts.length;
        return isNaN(result) ? 1 : result; // Default to 1 if NaN
    }
}
