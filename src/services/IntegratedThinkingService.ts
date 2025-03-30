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
import { EmbeddingUtil } from '../utils/EmbeddingUtil.js';
import { calculateRelevanceScore } from '../utils/SimilarityUtil.js';
import { CoherenceCheckerUtil } from '../utils/CoherenceCheckerUtil.js'; // Added Import


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

        // Note: SequentialThinkingService constructor doesn't seem async, safe for now
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
        // No changes needed
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

    /**
     * Initialize metrics tracking
     */
    private initializeMetrics(): IntegratedMetrics {
        // No changes needed
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
                    successRate: 0,
                    lastCategory: undefined,
                    lastConfidence: undefined,
                    categoryHistory: []
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
        // No changes needed
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
        // No changes needed
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
        // Log the specific error point if possible
        logger.error(`Integration Error during phase: ${this.processingState.currentPhase}`, error); // Enhanced logging

        this.metrics.mcpIntegrationMetrics.failures++;
        this.metrics.mcpIntegrationMetrics.lastError = error instanceof Error ? error.message : String(error);

        if (this.config.debugConfig.errorCapture) {
            // Already logged above, maybe add more state detail here if needed
            // logger.error('Integration Error State:', { state: this.processingState });
        }

        // Update state to error
        this.processingState.currentPhase = 'error';

        throw new McpError(
            ErrorCode.InternalError,
            `Failed to process integrated thought. Phase: ${this.processingState.currentPhase}. Error: ${error instanceof Error ? error.message : String(error)}` // More detailed message
        );
    }

    /**
     * Update processing metrics
     */
    private updateMetrics(startTime: number): void {
        // No changes needed for this method itself
        const processingTime = Date.now() - startTime;
        this.metrics.processingTimes.push(processingTime);
        this.metrics.successRate = this.calculateSuccessRate();

        // Update category tracking in metrics
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

    /**
     * Calculate overall success rate
     */
    private calculateSuccessRate(): number {
        // No changes needed
        const totalOperations = this.metrics.mcpIntegrationMetrics.calls; // Should this track internal steps instead?
        if (totalOperations === 0) return 0;
        return (totalOperations - this.metrics.mcpIntegrationMetrics.failures) / totalOperations;
        // Alternative: Base on completedSteps vs errors?
        // const successfulSteps = this.processingState.completedSteps - this.metrics.mcpIntegrationMetrics.failures;
        // return successfulSteps / Math.max(1, this.processingState.completedSteps);
    }

    /**
     * Log current metrics
     */
    private logMetrics(): void {
        // No changes needed
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
        confidence?: number; // This input confidence might be less relevant now
        context?: IntegratedResult['context'];
        mcpFeatures?: IntegratedResult['mcpFeatures'];
    }): Promise<IntegratedResult> {
        const startTime = Date.now();
        this.updateProcessingState('processing'); // Set phase early

        try {
            logger.info('processIntegratedThought: Starting...'); // +++ LOGGING
            // Process with sequential thinking service (now async)
            // Assuming processThought now returns the full SequentialThoughtData object or similar
            logger.info('processIntegratedThought: Calling sequentialService.processThought...'); // +++ LOGGING
            const sequentialResultObject = await this.sequentialService.processThought({ // Added await
                thought: input.content,
                thoughtNumber: input.thoughtNumber,
                totalThoughts: input.totalThoughts,
                nextThoughtNeeded: input.nextStepNeeded,
                isRevision: input.isRevision,
                ...(input.revisesDraft ? { revisesThought: input.revisesDraft } : {}),
                // Pass context, confidence calculation is internal now
                context: input.context
            });
            logger.info('processIntegratedThought: sequentialService.processThought completed.'); // +++ LOGGING

            // Check for errors from sequential service
            if (sequentialResultObject.isError || !sequentialResultObject.content || sequentialResultObject.content.length === 0) {
                throw new Error(`Sequential thinking service failed: ${sequentialResultObject.content?.[0]?.text || 'Unknown error'}`);
            }
            // Parse the actual data (assuming it's still JSON in the first content item)
            logger.info('processIntegratedThought: Parsing sequential result...'); // +++ LOGGING
            const sequentialOutput = JSON.parse(sequentialResultObject.content[0].text) as SequentialThoughtData;
            logger.info('processIntegratedThought: Sequential result parsed.'); // +++ LOGGING


            // Process with draft service (now async)
            logger.info('processIntegratedThought: Calling draftService.processDraft...'); // +++ LOGGING
            const draftResult = await this.draftService.processDraft({ // Added await
                content: input.content,
                draftNumber: input.draftNumber,
                totalDrafts: input.totalDrafts,
                needsRevision: input.needsRevision, // This might be determined internally now? Check CoD service.
                nextStepNeeded: input.nextStepNeeded,
                isRevision: input.isRevision,
                ...(input.isRevision && typeof input.revisesDraft === 'number' ? { revisesDraft: input.revisesDraft } : {}),
                isCritique: input.isCritique,
                critiqueFocus: input.critiqueFocus,
                reasoningChain: input.reasoningChain,
                category: input.category, // Pass category if provided, CoD might override/calculate
                // Pass context, confidence calculation is internal now
                context: input.context
            });
            logger.info('processIntegratedThought: draftService.processDraft completed.'); // +++ LOGGING

            // Generate MCP enhancements (now async)
            logger.info('processIntegratedThought: Calling generateMCPEnhancements...'); // +++ LOGGING
            const mcpEnhancements = await this.generateMCPEnhancements( // Added await
                sequentialOutput, // Use the parsed object
                draftResult,      // Use the direct result
                input.mcpFeatures
            );
            logger.info('processIntegratedThought: generateMCPEnhancements completed.'); // +++ LOGGING

            // Update metrics (using the calculated confidence from mcpEnhancements)
            // We need the final confidence score to update metrics correctly
            logger.info('processIntegratedThought: Updating metrics...'); // +++ LOGGING
            this.processingState.currentConfidence = mcpEnhancements.confidence; // Update state before metrics
            this.updateMetrics(startTime);

            // Determine the final category type, ensuring it's valid for IntegratedResult
            logger.info('processIntegratedThought: Determining final category...'); // +++ LOGGING
            let finalCategoryType: IntegratedResult['category']['type'] = 'initial'; // Default
            if (input.category && ['initial', 'critique', 'revision', 'final'].includes(input.category.type)) {
                finalCategoryType = input.category.type as IntegratedResult['category']['type'];
            } else if (input.isRevision) {
                finalCategoryType = 'revision';
            } else if (input.isCritique) {
                finalCategoryType = 'critique';
            }
            // Always use the calculated integrated confidence
            const finalCategory: IntegratedResult['category'] = {
                type: finalCategoryType,
                confidence: mcpEnhancements.confidence
            };
            this.processingState.currentCategory = finalCategory.type; // Update state
            logger.info(`processIntegratedThought: Final category set to ${finalCategory.type} with confidence ${finalCategory.confidence}`); // +++ LOGGING


            // Filter response based on verbose settings
            logger.info('processIntegratedThought: Filtering response...'); // +++ LOGGING
            const response = this.filterResponseByVerboseSettings({
                sequentialOutput, // Use parsed object
                draftOutput: draftResult, // Use direct result
                mcpEnhancements,
                metrics: this.metrics,
                category: finalCategory, // Use determined final category
                context: input.context || {}, // Merge contexts? For now, use input context
                mcpFeatures: input.mcpFeatures || {}
            });
            logger.info('processIntegratedThought: Response filtered.'); // +++ LOGGING

            return response;
        } catch (error) {
            // Error is logged within handleIntegrationError
            this.handleIntegrationError(error);
            // Since handleIntegrationError throws, this throw might be redundant,
            // but ensures the promise rejects if handleIntegrationError changes.
            throw error;
        } finally {
            // Ensure state is updated even if errors occur before this point
            if (this.processingState.currentPhase !== 'completion' && this.processingState.currentPhase !== 'error') {
                this.updateProcessingState('completion');
                logger.info('processIntegratedThought: Processing complete.'); // +++ LOGGING
            } else if (this.processingState.currentPhase === 'error') {
                logger.info('processIntegratedThought: Processing ended due to error.'); // +++ LOGGING
            }
        }
    }

    /**
     * Filter response based on verbose settings
     */
    private filterResponseByVerboseSettings(response: IntegratedResult): IntegratedResult {
        // This method needs significant updates if the structure of sequentialOutput/draftOutput changes
        // Assuming they still contain the core fields needed.

        // If full response is enabled, return everything
        if (this.config.verboseConfig.showFullResponse) {
            return response;
        }

        // Create filtered structure, accessing potentially nested data if needed
        const filteredResponse: IntegratedResult = {
            sequentialOutput: {
                thoughtNumber: response.sequentialOutput.thoughtNumber,
                totalThoughts: response.sequentialOutput.totalThoughts,
                nextThoughtNeeded: response.sequentialOutput.nextThoughtNeeded,
                thought: response.sequentialOutput.thought,
                confidence: response.sequentialOutput.confidence, // Confidence from sequential service
                context: response.sequentialOutput.context || {}
                // Add metrics if needed based on verbose settings
            },
            draftOutput: {
                content: response.draftOutput.content,
                draftNumber: response.draftOutput.draftNumber,
                totalDrafts: response.draftOutput.totalDrafts,
                needsRevision: response.draftOutput.needsRevision,
                category: response.draftOutput.category, // Category from draft service
                confidence: response.draftOutput.confidence, // Confidence from draft service
                nextStepNeeded: response.draftOutput.nextStepNeeded,
                context: response.draftOutput.context || {}
                // Add metrics if needed
            },
            category: response.category, // Final integrated category
            context: response.context,
            mcpFeatures: response.mcpFeatures,
            mcpEnhancements: response.mcpEnhancements, // Includes integrated confidence
            metrics: { // Initialize basic metrics structure
                startTime: response.metrics.startTime,
                processingTimes: [],
                successRate: 0,
                mcpIntegrationMetrics: { calls: 0, failures: 0, averageLatency: 0 },
                serviceMetrics: {
                    sequential: { totalThoughts: 0, averageProcessingTime: 0, successRate: 0, categoryHistory: [] },
                    draft: { totalDrafts: 0, averageProcessingTime: 0, successRate: 0 }
                }
            }
        };

        // Populate metrics based on verbose settings
        if (this.config.verboseConfig.showProcessingMetrics) {
            filteredResponse.metrics.processingTimes = response.metrics.processingTimes;
            filteredResponse.metrics.successRate = response.metrics.successRate;
        }
        if (this.config.verboseConfig.showServiceMetrics) {
            filteredResponse.metrics.serviceMetrics = response.metrics.serviceMetrics;
        }
        if (this.config.verboseConfig.showMcpMetrics) {
            filteredResponse.metrics.mcpIntegrationMetrics = response.metrics.mcpIntegrationMetrics;
        }

        // Add detailed metrics from sequentialOutput if requested and available
        if (response.sequentialOutput.metrics) {
            if (!filteredResponse.sequentialOutput.metrics) {
                // Initialize if not present
                filteredResponse.sequentialOutput.metrics = {
                    processingTime: response.sequentialOutput.metrics.processingTime,
                    resourceUsage: response.sequentialOutput.metrics.resourceUsage,
                    dependencyChain: response.sequentialOutput.metrics.dependencyChain || []
                };
            }

            if (this.config.verboseConfig.showAdaptationHistory && response.sequentialOutput.metrics.dynamicAdaptation) {
                filteredResponse.sequentialOutput.metrics.dynamicAdaptation = response.sequentialOutput.metrics.dynamicAdaptation;
            }
            if (this.config.verboseConfig.showCategoryHistory && response.metrics.serviceMetrics.sequential.categoryHistory) {
                // Category history is now top-level in metrics
                filteredResponse.metrics.serviceMetrics.sequential.categoryHistory = response.metrics.serviceMetrics.sequential.categoryHistory;
            }
            if (this.config.verboseConfig.showDependencyChain && response.sequentialOutput.metrics.dependencyChain) {
                filteredResponse.sequentialOutput.metrics.dependencyChain = response.sequentialOutput.metrics.dependencyChain;
            }
            if (this.config.verboseConfig.showDebugMetrics) {
                filteredResponse.sequentialOutput.metrics.dynamicAdaptation = response.sequentialOutput.metrics.dynamicAdaptation;
                filteredResponse.sequentialOutput.metrics.processingState = response.sequentialOutput.metrics.processingState;
            }
            if (this.config.verboseConfig.showMemoryUsage) {
                // resourceUsage is already included if metrics are shown
            }
            if (this.config.verboseConfig.showParallelTaskInfo && response.sequentialOutput.metrics.processingState) {
                filteredResponse.sequentialOutput.metrics.processingState = response.sequentialOutput.metrics.processingState;
            }
        }
        // TODO: Add similar logic for draftOutput metrics if needed and available


        return filteredResponse;
    }

    /**
     * Generate MCP enhancements based on service results
     */
    // Made async because it calls async calculateIntegratedConfidence
    private async generateMCPEnhancements(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData,
        features?: IntegratedResult['mcpFeatures']
    ): Promise<MCPEnhancements> { // Return type is Promise now
        const draftContextWindow = this.config.draftConfig.contextWindow ?? 16384;
        const sequentialContextWindow = this.config.sequentialConfig.contextWindow ?? 163840;

        // Calculate integrated confidence (now async)
        const confidence = await this.calculateIntegratedConfidence(sequentialResult, draftResult); // Added await

        const enhancements: MCPEnhancements = {
            contextWindow: Math.max(draftContextWindow, sequentialContextWindow),
            confidence, // Use the calculated async confidence
            suggestions: [],
            optimizations: []
        };

        if (features?.monitoring) {
            enhancements.optimizations.push({
                type: 'performance',
                description: 'Optimized context window based on monitoring',
                impact: 0.8
            });
        }

        if (features?.parallelProcessing) {
            enhancements.suggestions.push(
                'Consider parallel processing for improved performance'
            );
        }

        // Adjust confidence threshold based on success rate
        this.adjustConfidenceThreshold(this.calculateSuccessRate()); // Stays sync

        return enhancements; // Return directly
    }

    /**
     * Calculate integrated confidence score
     */
    // Made async because it calls async calculateContextRelevance and calculateContentQuality
    private async calculateIntegratedConfidence(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData
    ): Promise<number> { // Return type is Promise now
        // Base confidence from individual services (use confidence from the results)
        const sequentialConfidence = Math.min(0.95, sequentialResult.confidence || 0.5);
        const draftConfidence = Math.min(0.95, draftResult.confidence || 0.5);

        // Calculate content quality score (now async)
        const contentQuality = await this.calculateContentQuality(sequentialResult, draftResult); // Added await

        // Calculate processing success score (sync)
        const processingSuccess = Math.min(0.95, 1 - (1 - this.calculateSuccessRate()));

        // Calculate context relevance (now async)
        const contextRelevance = await this.calculateContextRelevance(sequentialResult, draftResult); // Added await

        // Calculate resource efficiency (sync)
        const resourceEfficiency = this.calculateResourceEfficiency();

        // Weight components for final confidence
        const weights = {
            content: 0.35,
            processing: 0.25,
            context: 0.25, // Use the async result here
            resource: 0.15
        };

        // Calculate weighted confidence score with minimum growth enforcement
        let confidence = Math.min(0.95, (
            contentQuality * weights.content +
            processingSuccess * weights.processing +
            contextRelevance * weights.context + // Use async result
            resourceEfficiency * weights.resource
        ));

        // Enforce minimum confidence growth if not first thought/draft
        // Need to access integrated metrics history, not just sequential
        const lastIntegratedConfidence = this.getLastIntegratedConfidence(); // FIX: Renamed method call
        if (lastIntegratedConfidence !== undefined && this.processingState.completedSteps > 0) { // Check if not first step
            const minExpectedConfidence = Math.min(0.95, Math.max(
                (this.config.sequentialConfig?.confidenceThreshold || 0.6) + (this.config.draftConfig?.minConfidenceGrowth || 0.05),
                lastIntegratedConfidence + (this.config.draftConfig?.minConfidenceGrowth || 0.05) // Compare to last integrated confidence
            ));
            confidence = Math.min(0.95, Math.max(confidence, minExpectedConfidence));
        }


        // Apply revision confidence requirements
        if (draftResult.isRevision || sequentialResult.isRevision) {
            confidence = Math.min(0.95, Math.max(
                confidence,
                this.config.draftConfig?.minRevisionConfidence || 0.65,
                sequentialConfidence, // Compare against individual service confidences too
                draftConfidence
            ));
        }

        // Store current confidence in processing state (happens in caller now)
        // this.processingState.currentConfidence = confidence;

        // Apply adaptive threshold and ensure maximum cap
        return Math.min(0.95, Math.max(0.4, confidence));
    }

    /**
     * Calculate content quality score, now incorporating LLM coherence check.
     */
    // Made async
    private async calculateContentQuality(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData
    ): Promise<number> { // Made async

        // Combine text for coherence check
        const combinedText = [sequentialResult.thought, draftResult.content].filter(Boolean).join('\n');

        // Get LLM coherence score (async)
        const coherenceScore = await CoherenceCheckerUtil.getInstance().checkCoherence(combinedText);

        // Calculate structure/length score (sync)
        const sequentialContent = sequentialResult.thought || '';
        const draftContent = draftResult.content || '';
        const hasStructure = sequentialContent.includes('\n') || draftContent.includes('\n');
        const appropriateLength = ( // Check combined length? Or individual? Let's stick to individual for now.
            sequentialContent.length > 50 && sequentialContent.length < 20000 &&
            (!draftContent || (draftContent.length > 50 && draftContent.length < 20000))
        );
        const structureScore = (hasStructure ? 0.5 : 0) + (appropriateLength ? 0.5 : 0);

        // Combine scores: e.g., 50% structure/length, 50% LLM coherence
        const finalScore = (structureScore * 0.5) + (coherenceScore * 0.5);

        return Math.min(1, finalScore); // Ensure score is capped at 1
    }

    /**
     * Calculate context relevance score using embeddings
     */
    // *** REPLACED METHOD ***
    private async calculateContextRelevance(
        sequentialResult: SequentialThoughtData,
        draftResult: DraftData
    ): Promise<number> { // Return type is Promise now
        // Combine text from both results for the target embedding
        const outputText = [sequentialResult.thought, draftResult.content].filter(Boolean).join('\n');
        // Merge context objects from both results
        const mergedContextObject = mergeContexts([
            sanitizeContext(sequentialResult.context),
            sanitizeContext(draftResult.context)
        ]);

        // Assemble context strings
        const contextStrings = [
            mergedContextObject.problemScope,
            ...(mergedContextObject.constraints || []),
            ...(mergedContextObject.assumptions || []),
            // TODO: Add optional previous step text based on config flag
            // const configManager = ConfigurationManager.getInstance();
            // if (configManager.getIntegratedConfig().includePreviousStepTextInContext) { ... }
        ].filter((s): s is string => typeof s === 'string' && s.trim() !== '');


        if (!outputText || contextStrings.length === 0) {
            logger.warn('No output text or context strings for integrated relevance calculation.');
            return 0.4; // Default low score
        }

        try {
            const embeddingUtil = EmbeddingUtil.getInstance();
            const targetEmbedding = await embeddingUtil.generateEmbedding(outputText);
            const contextEmbeddings = await embeddingUtil.generateEmbeddings(contextStrings);

            if (!targetEmbedding || !contextEmbeddings) {
                logger.error('Failed to generate embeddings for integrated relevance calculation.');
                return 0.3; // Return very low score on embedding failure
            }

            // Using the 'Max' strategy
            const relevanceScore = calculateRelevanceScore(targetEmbedding, contextEmbeddings);
            return relevanceScore;

        } catch (error) {
            logger.error('Error calculating integrated semantic relevance:', error);
            return 0.3; // Return very low score on error
        }
    }


    /**
     * Calculate resource efficiency score
     */
    private calculateResourceEfficiency(): number {
        // No changes needed
        const maxMemory = 1024 * 1024 * 200; // 200MB threshold
        const targetTime = 2000; // 2 seconds target
        const memoryScore = 1 - (process.memoryUsage().heapUsed / maxMemory);
        const timeScore = 1 - (this.getAverageProcessingTime() / targetTime); // Uses integrated processing times
        return Math.min(1, (memoryScore + timeScore) / 2);
    }

    /**
     * Adjust confidence threshold based on success rate
     */
    private adjustConfidenceThreshold(successRate: number): void {
        // No changes needed
        const minThreshold = 0.4;
        const maxThreshold = 0.9;
        const adjustmentFactor = 0.05;
        if (successRate > 0.8) {
            this.confidenceThreshold = Math.min(maxThreshold, this.confidenceThreshold + adjustmentFactor);
        } else if (successRate < 0.6) {
            this.confidenceThreshold = Math.max(minThreshold, this.confidenceThreshold - adjustmentFactor);
        }
    }

    // REMOVED - No longer needed by calculateContextRelevance
    // private extractContextKeywords(text: string): string[] { ... }

    // REMOVED - No longer needed by calculateContextRelevance
    // private getExpectedContext(...) { ... }


    /**
     * Get average processing time for integrated steps
     */
    private getAverageProcessingTime(): number {
        // No changes needed
        if (this.metrics.processingTimes.length === 0) return 0;
        const total = this.metrics.processingTimes.reduce((sum, time) => sum + time, 0);
        return total / this.metrics.processingTimes.length;
    }

    // REMOVED - Validation logic is complex and might be better handled within confidence calculation or specific checks
    // private validateIntegratedResult(result: IntegratedResult): boolean { ... }


    // Renamed from getLastResultConfidence to avoid confusion with service results
    private getLastIntegratedConfidence(): number | undefined {
        // Access integrated metrics history
        const history = this.metrics.serviceMetrics.sequential.categoryHistory; // Using this as proxy for integrated history
        if (!history || history.length === 0) {
            return undefined;
        }
        // Find the most recent entry that isn't the current step (tricky without step numbers here)
        // Let's assume the last entry before the current updateMetrics call is the previous one
        // This relies on updateMetrics being called *after* confidence calculation
        if (history.length > 1) {
            return history[history.length - 2].confidence; // Get second to last confidence
        } else if (history.length === 1 && this.processingState.completedSteps > 0) {
            // If only one entry but we know previous steps happened, return that one
            return history[0].confidence;
        }
        return undefined; // Default if truly the first step
    }

    // Renamed from getLastCategory
    private getLastIntegratedCategoryType(): string | undefined {
        // Access integrated metrics history
        const history = this.metrics.serviceMetrics.sequential.categoryHistory; // Using this as proxy
        if (!history || history.length === 0) {
            return undefined;
        }
        if (history.length > 1) {
            return history[history.length - 2].category; // Get second to last category type
        } else if (history.length === 1 && this.processingState.completedSteps > 0) {
            return history[0].category;
        }
        return undefined;
    }
}
