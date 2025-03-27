import { ChainOfDraftService } from './ChainOfDraftService.js';
import { SequentialThinkingService } from './SequentialThinkingService.js';
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

/**
 * Service that integrates Chain of Draft and Sequential Thinking with MCP capabilities.
 * Provides enhanced processing through the combination of both services with MCP integration.
 */
export class IntegratedThinkingService {
    private readonly draftService: ChainOfDraftService;
    private readonly sequentialService: SequentialThinkingService;
    private readonly mcpServer: McpServer;
    private readonly config: Required<IntegratedConfig>;
    private readonly processingState: IntegratedProcessingState;
    private readonly metrics: IntegratedMetrics;
    private confidenceThreshold: number;

    constructor(config: IntegratedConfig) {
        // Validate and set configuration using ConfigurationManager
        const configManager = ConfigurationManager.getInstance();
        const defaultConfig = configManager.getIntegratedConfig();
        this.config = {
            ...defaultConfig,
            ...config
        };

        // Initialize confidence threshold
        this.confidenceThreshold = this.config.sequentialConfig.confidenceThreshold || 0.7;

        // Map integrated enhancement config to service-specific configs
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

        // Initialize services
        this.draftService = new ChainOfDraftService(
            this.config.draftConfig,
            draftEnhancementConfig,
            this.config.debugConfig
        );

        this.sequentialService = new SequentialThinkingService(
            this.config.sequentialConfig,
            sequentialEnhancementConfig,
            this.config.debugConfig
        );

        // Initialize MCP server
        this.mcpServer = new McpServer({
            name: "integrated-thinking",
            version: "1.0.0"
        });

        // Initialize processing state
        this.processingState = this.initializeProcessingState();

        // Initialize metrics
        this.metrics = this.initializeMetrics();
    }

    /**
     * Initialize the processing state
     */
    private initializeProcessingState(): IntegratedProcessingState {
        return {
            currentPhase: 'initialization',
            activeThreads: 0,
            pendingOperations: [],
            completedSteps: 0,
            estimatedRemainingSteps: 0,
            adaptationHistory: []
        };
    }

    /**
     * Initialize metrics tracking
     */
    private initializeMetrics(): IntegratedMetrics {
        return {
            startTime: Date.now(),
            processingTimes: [],
            successRate: 0,
            mcpIntegrationMetrics: {
                calls: 0,
                failures: 0,
                averageLatency: 0
            },
            serviceMetrics: {
                sequential: {
                    totalThoughts: 0,
                    averageProcessingTime: 0,
                    successRate: 0
                },
                draft: {
                    totalDrafts: 0,
                    averageProcessingTime: 0,
                    successRate: 0
                }
            }
        };
    }

    /**
     * Update the processing state
     */
    private updateProcessingState(phase: IntegratedProcessingState['currentPhase']): void {
        this.processingState.currentPhase = phase;
        this.processingState.completedSteps++;

        if (this.config.enhancementConfig.enableAdaptiveProcessing) {
            this.adaptProcessing();
        }
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
     * Handle integration errors
     */
    private handleIntegrationError(error: unknown): void {
        this.metrics.mcpIntegrationMetrics.failures++;
        this.metrics.mcpIntegrationMetrics.lastError = error instanceof Error ? error.message : String(error);

        if (this.config.debugConfig.errorCapture) {
            logger.error('Integration Error:', {
                timestamp: Date.now(),
                error: error instanceof Error ? error.message : String(error),
                state: this.processingState
            });
        }

        throw new McpError(
            ErrorCode.InternalError,
            'Failed to process integrated thought'
        );
    }

    /**
     * Update processing metrics
     */
    private updateMetrics(startTime: number): void {
        const processingTime = Date.now() - startTime;
        this.metrics.processingTimes.push(processingTime);
        this.metrics.successRate = this.calculateSuccessRate();

        if (this.config.debugConfig.metricTracking) {
            this.logMetrics();
        }
    }

    /**
     * Calculate overall success rate
     */
    private calculateSuccessRate(): number {
        const totalOperations = this.metrics.mcpIntegrationMetrics.calls;
        if (totalOperations === 0) return 0;
        return (totalOperations - this.metrics.mcpIntegrationMetrics.failures) / totalOperations;
    }

    /**
     * Log current metrics
     */
    private logMetrics(): void {
        logger.debug('Processing metrics:', {
            time: Date.now() - this.metrics.startTime,
            memory: process.memoryUsage(),
            state: this.processingState,
            metrics: this.metrics
        });
    }

    /**
     * Process an integrated thought combining draft and sequential thinking
     */
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
        confidence?: number;
        context?: IntegratedResult['context'];
        mcpFeatures?: IntegratedResult['mcpFeatures'];
    }): Promise<IntegratedResult> {
        const startTime = Date.now();
        this.updateProcessingState('processing');

        try {
            // Process with sequential thinking service
            const sequentialResult = await this.sequentialService.processThought({
                thought: input.content,
                thoughtNumber: input.thoughtNumber,
                totalThoughts: input.totalThoughts,
                nextThoughtNeeded: input.nextStepNeeded,
                isRevision: input.isRevision,
                ...(input.revisesDraft ? { revisesThought: input.revisesDraft } : {}),
                confidence: input.confidence || 0.5,
                context: input.context
            });

            // Process with draft service
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
                category: input.category,
                confidence: input.confidence || 0.5,
                context: input.context
            });

            // Parse the sequential result
            const sequentialOutput = JSON.parse(sequentialResult.content[0].text) as SequentialThoughtData;

            // Generate MCP enhancements
            const mcpEnhancements = await this.generateMCPEnhancements(
                sequentialOutput,
                draftResult,
                input.mcpFeatures
            );

            // Update metrics
            this.updateMetrics(startTime);

            // Return integrated result
            return {
                sequentialOutput,
                draftOutput: draftResult,
                mcpEnhancements,
                metrics: this.metrics,
                category: input.category || {
                    type: 'initial',
                    confidence: input.confidence || 0.5
                },
                context: input.context || {},
                mcpFeatures: input.mcpFeatures || {}
            };
        } catch (error) {
            this.handleIntegrationError(error);
            throw error;
        } finally {
            this.updateProcessingState('completion');
        }
    }

    /**
     * Generate MCP enhancements based on service results
     */
    private async generateMCPEnhancements(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData,
        features?: IntegratedResult['mcpFeatures']
    ): Promise<MCPEnhancements> {
        const draftContextWindow = this.config.draftConfig.contextWindow ?? 16384;
        const sequentialContextWindow = this.config.sequentialConfig.contextWindow ?? 163840;

        // Calculate integrated confidence
        const confidence = this.calculateIntegratedConfidence(sequentialResult, draftResult);

        const enhancements: MCPEnhancements = {
            contextWindow: Math.max(draftContextWindow, sequentialContextWindow),
            confidence,
            suggestions: [],
            optimizations: []
        };

        if (features?.monitoring) {
            // Add monitoring-based optimizations
            enhancements.optimizations.push({
                type: 'performance',
                description: 'Optimized context window based on monitoring',
                impact: 0.8
            });
        }

        if (features?.parallelProcessing) {
            // Add parallel processing suggestions
            enhancements.suggestions.push(
                'Consider parallel processing for improved performance'
            );
        }

        // Adjust confidence threshold based on success rate
        this.adjustConfidenceThreshold(this.calculateSuccessRate());

        return enhancements;
    }

    /**
     * Calculate integrated confidence score
     */
    private calculateIntegratedConfidence(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData
    ): number {
        // Base confidence from individual services
        const sequentialConfidence = sequentialResult.confidence || 0.5;
        const draftConfidence = draftResult.confidence || 0.5;

        // Calculate content quality score
        const contentQuality = this.calculateContentQuality(sequentialResult, draftResult);

        // Calculate processing success score
        const processingSuccess = 1 - (1 - this.calculateSuccessRate());

        // Calculate context relevance
        const contextRelevance = this.calculateContextRelevance(sequentialResult, draftResult);

        // Calculate resource efficiency
        const resourceEfficiency = this.calculateResourceEfficiency();

        // Weight components for final confidence
        const weights = {
            content: 0.35,
            processing: 0.25,
            context: 0.25,
            resource: 0.15
        };

        // Calculate weighted confidence score with minimum growth enforcement
        let confidence = (
            contentQuality * weights.content +
            processingSuccess * weights.processing +
            contextRelevance * weights.context +
            resourceEfficiency * weights.resource
        );

        // Enforce minimum confidence growth if not first thought/draft
        if (this.metrics.serviceMetrics.sequential.totalThoughts > 1) {
            const minExpectedConfidence = Math.max(
                (this.config.sequentialConfig?.confidenceThreshold || 0.6) + (this.config.draftConfig?.minConfidenceGrowth || 0.05),
                sequentialConfidence + (this.config.draftConfig?.minConfidenceGrowth || 0.05)
            );
            confidence = Math.max(confidence, minExpectedConfidence);
        }

        // Apply revision confidence requirements
        if (draftResult.isRevision || sequentialResult.isRevision) {
            confidence = Math.max(
                confidence,
                this.config.draftConfig?.minRevisionConfidence || 0.65,
                sequentialConfidence,
                draftConfidence
            );
        }

        // Apply adaptive threshold
        return Math.min(0.95, Math.max(0.4, confidence));
    }

    /**
     * Calculate content quality score
     */
    private calculateContentQuality(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData
    ): number {
        // Weight individual service confidences
        const baseConfidence = (
            (sequentialResult.confidence || 0.5) * 0.6 +
            (draftResult.confidence || 0.5) * 0.4
        );

        // Analyze content structure
        const sequentialContent = sequentialResult.thought || '';
        const draftContent = draftResult.content || '';

        const hasStructure = sequentialContent.includes('\n') || draftContent.includes('\n');
        const appropriateLength = (
            sequentialContent.length > 50 && sequentialContent.length < 20000 &&
            (!draftContent || (draftContent.length > 50 && draftContent.length < 20000))
        );

        let score = baseConfidence;
        if (hasStructure) score += 0.1;
        if (appropriateLength) score += 0.1;

        return Math.min(1, score);
    }

    /**
     * Calculate context relevance score
     */
    private calculateContextRelevance(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData
    ): number {
        const expectedContext = this.getExpectedContext(sequentialResult, draftResult);
        const actualContext = this.extractContextKeywords(
            [sequentialResult.thought, draftResult.content].filter(Boolean).join('\n')
        );

        if (!expectedContext.length) return 0.7;

        // Use sanitized contexts for comparison
        const sequentialContext = sanitizeContext(sequentialResult.context);
        const draftContext = sanitizeContext(draftResult.context);

        // Get confidence scores
        const seqConfidence = getContextConfidence(sequentialContext);
        const draftConfidence = getContextConfidence(draftContext);

        // Calculate matches
        const matches = actualContext.filter(word =>
            expectedContext.some(keyword => word.includes(keyword))
        ).length;

        const matchScore = matches / Math.max(1, expectedContext.length);
        const confidenceScore = (seqConfidence + draftConfidence) / 2;

        return Math.min(1, (matchScore * 0.7) + (confidenceScore * 0.3));
    }

    /**
     * Calculate resource efficiency score
     */
    private calculateResourceEfficiency(): number {
        const maxMemory = 1024 * 1024 * 200; // 200MB threshold
        const targetTime = 2000; // 2 seconds target

        const memoryScore = 1 - (process.memoryUsage().heapUsed / maxMemory);
        const timeScore = 1 - (this.getAverageProcessingTime() / targetTime);

        return Math.min(1, (memoryScore + timeScore) / 2);
    }

    /**
     * Adjust confidence threshold based on success rate
     */
    private adjustConfidenceThreshold(successRate: number): void {
        const minThreshold = 0.4;
        const maxThreshold = 0.9;
        const adjustmentFactor = 0.05;

        if (successRate > 0.8) {
            // Increase threshold if success rate is high
            this.confidenceThreshold = Math.min(
                maxThreshold,
                this.confidenceThreshold + adjustmentFactor
            );
        } else if (successRate < 0.6) {
            // Decrease threshold if success rate is low
            this.confidenceThreshold = Math.max(
                minThreshold,
                this.confidenceThreshold - adjustmentFactor
            );
        }
    }

    /**
     * Extract keywords from text for context matching
     */
    private extractContextKeywords(text: string): string[] {
        return text
            .toLowerCase()
            .split(/[\s,.!?]+/)
            .filter(word => word.length > 3) // Filter out short words
            .slice(0, 10); // Limit to top 10 keywords
    }

    /**
     * Get expected context from both services
     */
    private getExpectedContext(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData
    ): string[] {
        const context: string[] = [];

        // Merge and sanitize contexts
        const mergedContext = mergeContexts([
            sanitizeContext(sequentialResult.context),
            sanitizeContext(draftResult.context)
        ]);

        if (hasContextContent(mergedContext)) {
            if (mergedContext.problemScope) {
                context.push(mergedContext.problemScope);
            }
            context.push(...(mergedContext.assumptions || []));
            context.push(...(mergedContext.constraints || []));
        }

        // Add content keywords
        if (sequentialResult.thought) {
            context.push(...this.extractContextKeywords(sequentialResult.thought));
        }
        if (draftResult.content) {
            context.push(...this.extractContextKeywords(draftResult.content));
        }

        return Array.from(new Set(context)); // Remove duplicates
    }

    /**
     * Get average processing time
     */
    private getAverageProcessingTime(): number {
        if (this.metrics.processingTimes.length === 0) return 0;

        const total = this.metrics.processingTimes.reduce((sum, time) => sum + time, 0);
        return total / this.metrics.processingTimes.length;
    }

    private validateIntegratedResult(result: IntegratedResult): boolean {
        // Validate confidence thresholds
        if (!result.category?.confidence) return false;

        const confidence = result.category.confidence;
        const isRevision = result.draftOutput?.isRevision || result.sequentialOutput?.isRevision || false;

        // Check minimum confidence requirements
        if (isRevision && confidence < (this.config.draftConfig?.minRevisionConfidence || 0.65)) {
            return false;
        }

        // Check confidence growth for non-first thoughts
        if (this.metrics.serviceMetrics.sequential.totalThoughts > 1) {
            const lastConfidence = this.getLastResultConfidence();
            if (lastConfidence && confidence < lastConfidence + (this.config.draftConfig?.minConfidenceGrowth || 0.05)) {
                return false;
            }
        }

        // Check base confidence threshold
        return confidence >= (this.config.sequentialConfig?.confidenceThreshold || 0.6);
    }

    private getLastResultConfidence(): number | undefined {
        return this.metrics.serviceMetrics.sequential.lastConfidence || undefined;
    }
} 