import { ChainOfDraftService } from './ChainOfDraftService.js';
import { SequentialThinkingService } from './SequentialThinkingService.js';
import { StorageService } from './StorageService.js'; // Import StorageService
import {
    IntegratedConfig,
    IntegratedMetrics,
    IntegratedProcessingState,
    IntegratedResult,
    MCPEnhancements
} from '../types/integrated.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { EnhancementConfig as DraftEnhancementConfig, DraftData } from '../types/chainOfDraft.js';
import { EnhancementConfig as SequentialEnhancementConfig, SequentialThoughtData } from '../types/index.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { sanitizeContext, getContextConfidence, hasContextContent, mergeContexts, logger } from '../utils/index.js';
import { EmbeddingUtil } from '../utils/EmbeddingUtil.js';
import { calculateRelevanceScore } from '../utils/SimilarityUtil.js';
import { CoherenceCheckerUtil } from '../utils/CoherenceCheckerUtil.js';


/**
 * Service that integrates Chain of Draft and Sequential Thinking with MCP capabilities.
 * Provides enhanced processing through the combination of both services with MCP integration.
 */
export class IntegratedThinkingService {
    private readonly draftService: ChainOfDraftService;
    private readonly sequentialService: SequentialThinkingService;
    private readonly mcpServer: McpServer; // Keep for potential future MCP interactions
    private readonly config: Required<IntegratedConfig>;
    private readonly processingState: IntegratedProcessingState; // Instance-specific state
    private readonly metrics: IntegratedMetrics; // Instance-specific metrics
    private confidenceThreshold: number;
    private storageService: StorageService; // Injected storage service

    constructor(config: IntegratedConfig, storageService: StorageService) {
        this.storageService = storageService;
        const configManager = ConfigurationManager.getInstance();
        const defaultConfig = configManager.getIntegratedConfig();
        this.config = { ...defaultConfig, ...config };
        this.confidenceThreshold = this.config.sequentialConfig.confidenceThreshold || 0.7;

        // Define enhancement configs based on integrated config
        const draftEnhancementConfig: Partial<DraftEnhancementConfig> = {
            enableSummarization: this.config.enhancementConfig.enableCrossServiceOptimization,
            draftCategorization: this.config.enhancementConfig.enableAdaptiveProcessing,
            progressTracking: this.config.enhancementConfig.enablePerformanceMonitoring,
            dynamicAdaptation: this.config.enhancementConfig.enableAdaptiveProcessing
        };
        const sequentialEnhancementConfig: Partial<SequentialEnhancementConfig> = {
            enableSummarization: this.config.enhancementConfig.enableCrossServiceOptimization,
            thoughtCategorization: this.config.enhancementConfig.enableAdaptiveProcessing,
            progressTracking: this.config.enhancementConfig.enablePerformanceMonitoring,
            dynamicAdaptation: this.config.enhancementConfig.enableAdaptiveProcessing
        };

        // Initialize underlying services, injecting StorageService into CoD
        this.draftService = new ChainOfDraftService(
            this.storageService,
            this.config.draftConfig,
            draftEnhancementConfig,
            this.config.debugConfig
        );
        this.sequentialService = new SequentialThinkingService(
            // Pass storage service here if/when SequentialThinking needs persistence
            this.config.sequentialConfig,
            sequentialEnhancementConfig,
            this.config.debugConfig
        );

        // Initialize internal MCP server representation (if needed for direct MCP calls)
        this.mcpServer = new McpServer({ name: "integrated-thinking-internal", version: "1.0.0" });

        // Initialize instance-specific state and metrics
        this.processingState = this.initializeProcessingState();
        this.metrics = this.initializeMetrics();
    }

    private initializeProcessingState(): IntegratedProcessingState {
        return {
            currentPhase: 'initialization',
            currentCategory: 'initial',
            currentConfidence: 0.5,
            activeThreads: 0,
            pendingOperations: [],
            completedSteps: 0,
            estimatedRemainingSteps: 0,
            adaptationHistory: [],
            minRequiredThoughts: 4,
            categoryHistory: []
        };
    }

    private initializeMetrics(): IntegratedMetrics {
        return {
            startTime: Date.now(),
            processingTimes: [],
            successRate: 0,
            mcpIntegrationMetrics: { calls: 0, failures: 0, averageLatency: 0, lastError: undefined },
            serviceMetrics: {
                sequential: { totalThoughts: 0, averageProcessingTime: 0, successRate: 0, lastCategory: undefined, lastConfidence: undefined, categoryHistory: [] },
                draft: { totalDrafts: 0, averageProcessingTime: 0, successRate: 0 }
            }
        };
    }

    private updateProcessingState(phase: IntegratedProcessingState['currentPhase']): void {
        this.processingState.currentPhase = phase;
        this.processingState.completedSteps++;
        if (this.config.enhancementConfig.enableAdaptiveProcessing) {
            this.adaptProcessing();
        }
    }

    private adaptProcessing(): void {
        const adaptation = {
            timestamp: Date.now(),
            adjustment: 'Default adjustment',
            reason: 'Default reason'
        };
        this.processingState.adaptationHistory.push(adaptation);
    }

    private handleIntegrationError(error: unknown): void {
        logger.error('Integration Error', error, { phase: this.processingState.currentPhase });
        this.metrics.mcpIntegrationMetrics.failures++;
        this.metrics.mcpIntegrationMetrics.lastError = error instanceof Error ? error.message : String(error);
        this.processingState.currentPhase = 'error';
        const message = error instanceof Error ? error.message : String(error);
        // Ensure McpError is thrown correctly
        throw new McpError(ErrorCode.InternalError, `Failed integration step: ${message}`);
    }

    private updateMetrics(startTime: number): void {
        const processingTime = Date.now() - startTime;
        this.metrics.processingTimes.push(processingTime);
        this.metrics.successRate = this.calculateSuccessRate();
        // Update category history in metrics
        if (this.processingState.currentPhase !== 'error') {
            this.metrics.serviceMetrics.sequential.lastCategory = this.processingState.currentCategory;
            this.metrics.serviceMetrics.sequential.lastConfidence = this.processingState.currentConfidence;
            if (!this.metrics.serviceMetrics.sequential.categoryHistory) {
                this.metrics.serviceMetrics.sequential.categoryHistory = [];
            }
            this.metrics.serviceMetrics.sequential.categoryHistory.push({
                category: this.processingState.currentCategory,
                confidence: this.processingState.currentConfidence,
                timestamp: Date.now()
            });
        }
        if (this.config.debugConfig.metricTracking) {
            this.logMetrics();
        }
    }

    private calculateSuccessRate(): number {
        const total = this.metrics.mcpIntegrationMetrics.calls; // Or use completedSteps?
        const failures = this.metrics.mcpIntegrationMetrics.failures;
        return total > 0 ? Math.max(0, (total - failures) / total) : 1; // Ensure non-negative
    }

    private logMetrics(): void {
        logger.debug('Integrated Processing metrics', { // Removed trailing colon
            time: Date.now() - this.metrics.startTime,
            memory: process.memoryUsage(),
            state: this.processingState,
            metrics: this.metrics
        });
    }

    // Define the input type more explicitly if possible, or use a generic approach
    // For now, using a structure that includes expected fields
    public async processIntegratedThought(input: {
        content: string;
        thoughtNumber: number;
        totalThoughts: number;
        draftNumber: number;
        totalDrafts: number;
        needsRevision: boolean;
        nextStepNeeded: boolean;
        isRevision?: boolean;
        revisesDraft?: number;
        isCritique?: boolean;
        critiqueFocus?: string;
        reasoningChain?: string[];
        category?: IntegratedResult['category'];
        confidence?: number; // Likely unused now
        context?: IntegratedResult['context'];
        mcpFeatures?: IntegratedResult['mcpFeatures'];
    }, sessionId: string): Promise<IntegratedResult> {
        const startTime = Date.now();
        this.updateProcessingState('processing');

        try {
            logger.info('processIntegratedThought: Starting', { sessionId });

            // Sequential Thinking Call
            logger.info('Calling sequentialService.processThought', { sessionId });
            const sequentialResultObject = await this.sequentialService.processThought({
                thought: input.content,
                thoughtNumber: input.thoughtNumber,
                totalThoughts: input.totalThoughts,
                nextThoughtNeeded: input.nextStepNeeded,
                isRevision: input.isRevision,
                ...(input.revisesDraft ? { revisesThought: input.revisesDraft } : {}),
                context: input.context
            });
            logger.info('sequentialService.processThought completed', { sessionId });
            if (sequentialResultObject.isError || !sequentialResultObject.content?.length) {
                throw new Error(`Sequential thinking service failed: ${sequentialResultObject.content?.[0]?.text || 'Unknown error'}`);
            }
            const sequentialOutput = JSON.parse(sequentialResultObject.content[0].text) as SequentialThoughtData;

            // Chain of Draft Call
            logger.info('Calling draftService.processDraft', { sessionId });
            const draftResult = await this.draftService.processDraft({
                content: input.content,
                draftNumber: input.draftNumber,
                totalDrafts: input.totalDrafts,
                needsRevision: input.needsRevision,
                nextStepNeeded: input.nextStepNeeded,
                isRevision: input.isRevision,
                ...(input.isRevision && typeof input.revisesDraft === 'number' ? { revisesDraft: input.revisesDraft } : {}),
                isCritique: input.isCritique,
                critiqueFocus: input.critiqueFocus,
                reasoningChain: input.reasoningChain,
                category: input.category, // Pass category from input
                context: input.context
            }, sessionId);
            logger.info('draftService.processDraft completed', { sessionId });

            // Enhancements & Confidence
            const mcpEnhancements = await this.generateMCPEnhancements(sequentialOutput, draftResult, input.mcpFeatures);
            this.processingState.currentConfidence = mcpEnhancements.confidence;
            this.updateMetrics(startTime);

            // Determine Final Category
            let finalCategoryType: IntegratedResult['category']['type'] = 'initial';
            if (input.category && ['initial', 'critique', 'revision', 'final'].includes(input.category.type)) {
                finalCategoryType = input.category.type as IntegratedResult['category']['type'];
            } else if (input.isRevision) { finalCategoryType = 'revision'; }
            else if (input.isCritique) { finalCategoryType = 'critique'; }
            // Ensure 'final' type is only set if thoughtNumber matches totalThoughts
            if (finalCategoryType === 'final' && input.thoughtNumber !== input.totalThoughts) {
                logger.warn('Correcting category: \'final\' used prematurely. Setting to intermediate.', { sessionId, thoughtNumber: input.thoughtNumber, totalThoughts: input.totalThoughts });
                finalCategoryType = input.thoughtNumber % 2 === 0 ? 'critique' : 'revision'; // Revert to intermediate
            }
            const finalCategory: IntegratedResult['category'] = { type: finalCategoryType, confidence: mcpEnhancements.confidence };
            this.processingState.currentCategory = finalCategory.type;

            // Filter and Return
            // Construct the full response object before filtering
            const fullResponse: IntegratedResult = {
                sequentialOutput,
                draftOutput: draftResult,
                mcpEnhancements,
                metrics: this.metrics,
                category: finalCategory,
                context: input.context || {},
                mcpFeatures: input.mcpFeatures || {}
            };
            const response = this.filterResponseByVerboseSettings(fullResponse);
            return response;

        } catch (error) {
            this.handleIntegrationError(error);
            throw error; // Ensure error propagates
        } finally {
            if (this.processingState.currentPhase !== 'completion' && this.processingState.currentPhase !== 'error') {
                this.updateProcessingState('completion');
            }
        }
    }

    private filterResponseByVerboseSettings(response: IntegratedResult): IntegratedResult {
        // Implement actual filtering based on this.config.verboseConfig
        // For now, return the full response
        if (this.config.verboseConfig.showFullResponse) {
            return response;
        }
        // Basic filtering example (can be expanded)
        const filtered: Partial<IntegratedResult> = {
            category: response.category,
            context: response.context,
            mcpFeatures: response.mcpFeatures,
            mcpEnhancements: response.mcpEnhancements // Often useful
        };
        // Conditionally add outputs and metrics based on verbose flags
        // TODO: Add specific checks if VerboseConfig is extended later
        // if (this.config.verboseConfig.showSequentialOutput) filtered.sequentialOutput = response.sequentialOutput;
        // if (this.config.verboseConfig.showDraftOutput) filtered.draftOutput = response.draftOutput;
        if (this.config.verboseConfig.showProcessingMetrics || this.config.verboseConfig.showServiceMetrics || this.config.verboseConfig.showMcpMetrics) {
            // Ensure metrics object exists before assigning properties
            if (!filtered.metrics) {
                filtered.metrics = { ...this.initializeMetrics() }; // Initialize with defaults
            }
            // Selectively copy metrics based on flags (Needs detailed implementation based on VerboseConfig)
            if (this.config.verboseConfig.showProcessingMetrics) {
                filtered.metrics.processingTimes = response.metrics.processingTimes;
                filtered.metrics.successRate = response.metrics.successRate;
            }
            if (this.config.verboseConfig.showServiceMetrics) {
                filtered.metrics.serviceMetrics = response.metrics.serviceMetrics;
            }
            if (this.config.verboseConfig.showMcpMetrics) {
                filtered.metrics.mcpIntegrationMetrics = response.metrics.mcpIntegrationMetrics;
            }
        } else {
            // If no metric flags are set, ensure metrics is undefined or minimal
            filtered.metrics = undefined;
        }
        return filtered as IntegratedResult; // Cast back, assuming essential parts are present
    }

    private async generateMCPEnhancements(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData,
        features?: IntegratedResult['mcpFeatures']
    ): Promise<MCPEnhancements> {
        const confidence = await this.calculateIntegratedConfidence(sequentialResult, draftResult);
        const enhancements: MCPEnhancements = {
            contextWindow: Math.max(this.config.draftConfig.contextWindow ?? 0, this.config.sequentialConfig.contextWindow ?? 0),
            confidence: confidence,
            suggestions: [],
            optimizations: []
        };
        if (features?.monitoring) {
            enhancements.optimizations.push({ type: 'performance', description: 'Monitoring enabled', impact: 0 }); // Example
        }
        if (features?.parallelProcessing) {
            enhancements.suggestions.push('Parallel processing might be applicable.');
        }
        this.adjustConfidenceThreshold(this.calculateSuccessRate());
        return enhancements;
    }

    private async calculateIntegratedConfidence(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData
    ): Promise<number> {
        const sequentialConfidence = sequentialResult.confidence ?? 0.5;
        const draftConfidence = draftResult.confidence ?? 0.5;
        const contentQuality = await this.calculateContentQuality(sequentialResult, draftResult);
        const processingSuccess = this.calculateSuccessRate();
        const contextRelevance = await this.calculateContextRelevance(sequentialResult, draftResult);
        const resourceEfficiency = this.calculateResourceEfficiency();
        const weights = { content: 0.35, processing: 0.25, context: 0.25, resource: 0.15 };

        let confidence = (
            contentQuality * weights.content +
            processingSuccess * weights.processing +
            contextRelevance * weights.context +
            resourceEfficiency * weights.resource
        );
        confidence = isNaN(confidence) ? 0.5 : confidence;

        const lastIntegratedConfidence = this.getLastIntegratedConfidence() ?? 0;
        if (this.processingState.completedSteps > 0) {
            const minExpected = Math.min(0.95, Math.max(
                (this.config.sequentialConfig?.confidenceThreshold || 0.6) + (this.config.draftConfig?.minConfidenceGrowth || 0.05),
                lastIntegratedConfidence + (this.config.draftConfig?.minConfidenceGrowth || 0.05)
            ));
            confidence = Math.max(confidence, minExpected);
        }
        if (draftResult.isRevision || sequentialResult.isRevision) {
            confidence = Math.max(
                confidence,
                this.config.draftConfig?.minRevisionConfidence || 0.65,
                sequentialConfidence,
                draftConfidence
            );
        }
        return Math.min(0.95, Math.max(0.4, confidence));
    }

    private async calculateContentQuality(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData
    ): Promise<number> {
        // Combine text for coherence check
        const combinedText = [sequentialResult.thought, draftResult.content].filter(Boolean).join('\n');
        const coherenceScore = await CoherenceCheckerUtil.getInstance().checkCoherence(combinedText || '');

        // Calculate structure/length score (sync)
        const sequentialContent = sequentialResult.thought || '';
        const draftContent = draftResult.content || '';
        const hasStructure = sequentialContent.includes('\n') || draftContent.includes('\n');
        const appropriateLength = (
            sequentialContent.length > 50 && sequentialContent.length < 20000 &&
            (!draftContent || (draftContent.length > 50 && draftContent.length < 20000))
        );
        const structureScore = (hasStructure ? 0.5 : 0) + (appropriateLength ? 0.5 : 0);

        const finalScore = (structureScore * 0.5) + (coherenceScore * 0.5);
        return isNaN(finalScore) ? 0.5 : Math.min(1, finalScore);
    }

    private async calculateContextRelevance(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData
    ): Promise<number> {
        const outputText = [sequentialResult.thought, draftResult.content].filter(Boolean).join('\n');
        const mergedContextObject = mergeContexts([
            sanitizeContext(sequentialResult.context),
            sanitizeContext(draftResult.context)
        ]);
        const contextStrings = [
            mergedContextObject.problemScope,
            ...(mergedContextObject.constraints || []),
            ...(mergedContextObject.assumptions || []),
        ].filter((s): s is string => typeof s === 'string' && s.trim() !== '');

        if (!outputText || contextStrings.length === 0) return 0.4;

        try {
            const embeddingUtil = EmbeddingUtil.getInstance();
            const targetEmbedding = await embeddingUtil.generateEmbedding(outputText);
            const contextEmbeddings = await embeddingUtil.generateEmbeddings(contextStrings);
            if (!targetEmbedding || !contextEmbeddings) return 0.3;
            const relevanceScore = calculateRelevanceScore(targetEmbedding, contextEmbeddings);
            return isNaN(relevanceScore) ? 0.4 : relevanceScore;
        } catch (error) {
            // Add context object here
            logger.error('Error calculating integrated semantic relevance', error, { sequentialThought: sequentialResult.thought, draftContent: draftResult.content });
            return 0.3;
        }
    }

    private calculateResourceEfficiency(): number {
        const maxMemory = 1024 * 1024 * 200; // 200MB
        const targetTime = 2000; // 2s
        const memoryUsage = process.memoryUsage().heapUsed;
        const processingTime = this.getAverageProcessingTime(); // Use instance avg time

        const memoryScore = Math.max(0, 1 - (memoryUsage / maxMemory));
        const timeScore = Math.max(0, 1 - (processingTime / targetTime));
        const result = (memoryScore + timeScore) / 2;
        return isNaN(result) ? 0.5 : Math.max(0, Math.min(1, result));
    }

    private adjustConfidenceThreshold(successRate: number): void {
        const minThreshold = 0.4;
        const maxThreshold = 0.9;
        const adjustmentFactor = 0.05;
        if (successRate > 0.8) {
            this.confidenceThreshold = Math.min(maxThreshold, this.confidenceThreshold + adjustmentFactor);
        } else if (successRate < 0.6) {
            this.confidenceThreshold = Math.max(minThreshold, this.confidenceThreshold - adjustmentFactor);
        }
    }

    private getAverageProcessingTime(): number {
        if (this.metrics.processingTimes.length === 0) return 1000; // Default 1s
        const total = this.metrics.processingTimes.reduce((sum, time) => sum + time, 0);
        const avg = total / this.metrics.processingTimes.length;
        return isNaN(avg) ? 1000 : avg;
    }

    private getLastIntegratedConfidence(): number | undefined {
        const history = this.metrics.serviceMetrics.sequential.categoryHistory;
        if (!history || history.length === 0) return undefined;
        // Simplified: return last known confidence
        return history[history.length - 1].confidence;
    }

    private getLastIntegratedCategoryType(): string | undefined {
        const history = this.metrics.serviceMetrics.sequential.categoryHistory;
        if (!history || history.length === 0) return undefined;
        // Simplified: return last known category
        return history[history.length - 1].category;
    }
}
