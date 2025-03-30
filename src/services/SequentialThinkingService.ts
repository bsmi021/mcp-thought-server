import { SequentialThoughtData, ThoughtCategory, CoreConfig, EnhancementConfig, DebugConfig, ProcessingState, ThoughtInitialization, DynamicAdaptation, ThoughtContext, ThoughtMetrics } from "../types/index.js";
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import chalk from "chalk";
import { sanitizeContext, getContextConfidence, hasContextContent, logger } from '../utils/index.js';
import { EmbeddingUtil } from '../utils/EmbeddingUtil.js';
import { calculateRelevanceScore } from '../utils/SimilarityUtil.js';
import { CoherenceCheckerUtil } from '../utils/CoherenceCheckerUtil.js'; // Added Import

export class SequentialThinkingService {
    private thoughtHistory: SequentialThoughtData[] = [];
    private branches: Record<string, SequentialThoughtData[]> = {};
    private parallelTasks: Map<string, Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>> = new Map();
    private summaries: Map<string, string> = new Map();
    private processingState: ProcessingState = {
        currentPhase: 'initialization',
        activeThreads: 0,
        pendingBranches: [],
        completedSteps: 0,
        estimatedRemainingSteps: 0,
        adaptationHistory: []
    };
    private readonly config: Required<CoreConfig>;
    private readonly enhancementConfig: Required<EnhancementConfig>;
    private readonly debugConfig: Required<DebugConfig>;
    private readonly metrics: ThoughtMetrics & { totalThoughts: number } = {
        processingTime: 0,
        resourceUsage: process.memoryUsage().heapUsed,
        dependencyChain: [],
        totalThoughts: 0
    };
    private processingTimes: number[] = [];  // Track processing times separately
    private progressMetrics: {
        startTime: number;
        completedThoughts: number;
        totalExpectedThoughts: number;
        lastUpdateTime: number;
        processingRate: number;
    } = {
            startTime: Date.now(),
            completedThoughts: 0,
            totalExpectedThoughts: 0,
            lastUpdateTime: Date.now(),
            processingRate: 0
        };

    constructor(
        config: Partial<CoreConfig> = {},
        enhancementConfig: Partial<EnhancementConfig> = {},
        debugConfig: Partial<DebugConfig> = {}
    ) {
        const configManager = ConfigurationManager.getInstance();
        const defaultConfig = configManager.getCoreConfig();

        // Set configurations
        this.config = {
            ...defaultConfig,
            ...config
        };

        this.enhancementConfig = {
            enableSummarization: true,
            thoughtCategorization: true,
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

        // Initialize metrics with required fields
        this.metrics = {
            processingTime: 0,
            resourceUsage: process.memoryUsage().heapUsed,
            dependencyChain: [],
            totalThoughts: 0
        };
    }

    // Note: validateData might need to become async if calculateThoughtConfidence becomes async
    public async validateData(input: unknown): Promise<SequentialThoughtData> { // Made async
        const data = input as Partial<SequentialThoughtData>;
        const startTime = performance.now();

        // Basic validation
        if (!data.thought || typeof data.thought !== 'string') {
            throw new Error('Invalid thought: must be a string');
        }
        if (!data.thoughtNumber || typeof data.thoughtNumber !== 'number') {
            throw new Error('Invalid thoughtNumber: must be a number');
        }
        if (!data.totalThoughts || typeof data.totalThoughts !== 'number') {
            throw new Error('Invalid totalThoughts: must be a number');
        }
        if (typeof data.nextThoughtNeeded !== 'boolean') {
            throw new Error('Invalid nextThoughtNeeded: must be a boolean');
        }

        // Validate against maxDepth
        if (data.thoughtNumber > this.config.maxDepth) {
            throw new Error(`Thought number exceeds maximum depth of ${this.config.maxDepth}`);
        }

        // Calculate confidence using the new service (now async)
        const confidence = await this.calculateThoughtConfidence(data); // Added await

        // Track processing time
        const endTime = performance.now();
        const processingTime = endTime - startTime;

        // Initialize metrics
        const metrics: ThoughtMetrics = {
            processingTime,
            resourceUsage: process.memoryUsage().heapUsed,
            dependencyChain: this.buildDependencyChain(data)
        };

        // Construct validated thought data
        const validatedData: SequentialThoughtData = {
            thought: data.thought,
            thoughtNumber: data.thoughtNumber,
            totalThoughts: data.totalThoughts,
            nextThoughtNeeded: data.nextThoughtNeeded,
            isRevision: data.isRevision,
            revisesThought: data.revisesThought,
            branchFromThought: data.branchFromThought,
            branchId: data.branchId,
            needsMoreThoughts: data.needsMoreThoughts,
            category: data.category,
            confidence,
            metrics,
            context: data.context
        };

        return validatedData;
    }

    // Made async because it calls the async calculateContextRelevance
    private async calculateThoughtConfidence(thought: Partial<SequentialThoughtData>): Promise<number> {
        if (!thought.thought) {
            return 0.4; // Default confidence for invalid thoughts
        }

        // Base confidence from content quality (now async)
        const contentQuality = await this.calculateContentQuality(thought); // Added await

        // Calculate processing success score
        const processingSuccess = 1 - (1 - this.calculateSuccessRate());

        // Calculate context relevance (now async)
        const contextRelevance = await this.calculateContextRelevance(thought); // Added await

        // Calculate resource efficiency
        const resourceEfficiency = this.calculateResourceEfficiency();

        // Weight components for final confidence
        const weights = {
            content: 0.35,
            processing: 0.25,
            context: 0.25, // contextRelevance is now async result
            resource: 0.15
        };

        // Calculate weighted confidence score with minimum growth enforcement
        let confidence = (
            contentQuality * weights.content +
            processingSuccess * weights.processing +
            contextRelevance * weights.context +
            resourceEfficiency * weights.resource
        );

        // Enforce minimum confidence growth if not first thought
        if (this.metrics.totalThoughts > 1) {
            const lastConfidence = this.getLastThoughtConfidence();
            if (lastConfidence) {
                const minExpectedConfidence = Math.max(
                    (this.config?.confidenceThreshold || 0.6) + (this.config?.minConfidenceGrowth || 0.05),
                    lastConfidence + (this.config?.minConfidenceGrowth || 0.05)
                );
                confidence = Math.max(confidence, minExpectedConfidence);
            }
        }

        // Apply revision confidence requirements if this is a revision
        if (thought.isRevision) {
            confidence = Math.max(
                confidence,
                this.config?.minRevisionConfidence || 0.65
            );
        }

        // Apply adaptive threshold
        return Math.min(0.95, Math.max(0.4, confidence));
    }

    // Note: validateThought might need to become async if calculateThoughtConfidence becomes async
    private async validateThought(thought: SequentialThoughtData): Promise<boolean> { // Made async
        // Basic validation
        if (!thought.thought || thought.thought.length < 50) {
            return false;
        }

        // Calculate confidence (now async)
        const confidence = await this.calculateThoughtConfidence(thought); // Added await

        // Validate against minimum thresholds
        if (thought.isRevision) {
            return confidence >= (this.config?.minRevisionConfidence || 0.65);
        }

        // For regular thoughts, check confidence growth if not the first thought
        if (this.metrics.totalThoughts > 1) {
            const lastConfidence = this.getLastThoughtConfidence();
            if (lastConfidence) {
                const minExpectedConfidence = lastConfidence + (this.config?.minConfidenceGrowth || 0.05);
                return confidence >= minExpectedConfidence;
            }
        }

        // For first thought or when previous thought not found
        return confidence >= (this.config?.confidenceThreshold || 0.6);
    }

    private getLastThoughtConfidence(): number | undefined {
        // Accessing history directly, no change needed here
        const lastThought = this.thoughtHistory[this.thoughtHistory.length - 1];
        // const lastThought = Array.from(this.thoughtHistory.values()).pop(); // Original had .values() - likely error as thoughtHistory is array
        return lastThought?.confidence;
    }

    // Made async because it calls async checkCoherence
    private async calculateContentQuality(thought: Partial<SequentialThoughtData>): Promise<number> { // Made async
        if (!thought.thought) return 0.4;

        // Content structure metrics (50%)
        const hasStructure = thought.thought.includes('\n') || thought.thought.includes('.');
        const appropriateLength = thought.thought.length > 50 && thought.thought.length < 20000;
        const structureScore = (hasStructure ? 0.5 : 0) + (appropriateLength ? 0.5 : 0);

        // Content analysis metrics (50%) - Use LLM checker now
        // const coherenceScore = this.calculateCoherence(thought.thought); // <<< REMOVE THIS LINE
        // calculateRelevance is removed/replaced by calculateContextRelevance
        // Need to decide how to factor this into quality score now
        // Option 1: Remove relevanceScore from here, let calculateThoughtConfidence handle it directly
        // Option 2: Keep a simpler relevance check here (e.g., keyword based) as a quick filter?
        // Let's go with Option 1 for now, simplifying quality score.
        // const relevanceScore = this.calculateRelevance(thought); // Removed
        // const analysisScore = (coherenceScore + relevanceScore) / 2; // Adjusted
        // Content analysis metrics (50%) - Use LLM checker now
        const coherenceScore = await CoherenceCheckerUtil.getInstance().checkCoherence(thought.thought || ''); // Use new util
        const analysisScore = coherenceScore; // analysisScore is now LLM coherence score

        // Context alignment - REMOVED
        // const contextScore = this.calculateContextAlignment(thought); // Removed

        // Recalculate weights: Structure (50%), Analysis/Coherence (50%)
        return (
            structureScore * 0.5 +
            analysisScore * 0.5
            // contextScore * 0.3 // Removed
        );
    }

    // REMOVED - Replaced by CoherenceCheckerUtil
    // private calculateCoherence(content: string): number { ... } // Ensure this method definition is fully deleted if present

    // REMOVED - Replaced by calculateContextRelevance using embeddings
    // private calculateRelevance(thought: Partial<SequentialThoughtData>): number { ... }

    // REMOVED - Replaced by calculateContextRelevance using embeddings
    // private calculateContextAlignment(thought: Partial<SequentialThoughtData>): number { ... }

    // *** REPLACED METHOD ***
    private async calculateContextRelevance(thought: Partial<SequentialThoughtData>): Promise<number> {
        const outputText = thought.thought || '';
        const context = thought.context || {}; // Assuming context object is attached

        // Assemble context strings (Mandatory parts from current context)
        const contextStrings = [
            context.problemScope,
            ...(context.constraints || []),
            ...(context.assumptions || []),
            // TODO: Add optional previous step text based on config flag
            // const configManager = ConfigurationManager.getInstance();
            // if (configManager.getCoreConfig().includePreviousStepTextInContext) { ... }
        ].filter((s): s is string => typeof s === 'string' && s.trim() !== '');

        if (!outputText || contextStrings.length === 0) {
            // +++ LOGGING (Corrected Format)
            logger.warn('SequentialService: No output text or context strings for relevance calculation.', {
                outputTextProvided: !!outputText,
                contextStringsCount: contextStrings.length,
                contextInput: context // Log the input context object
            });
            return 0.4; // Default low score if no text or context
        }
        // +++ LOGGING (Corrected Format)
        logger.debug('SequentialService: Performing relevance calculation.', {
            outputTextChars: outputText.length,
            contextStringsCount: contextStrings.length
        });

        try {
            const embeddingUtil = EmbeddingUtil.getInstance(); // Get singleton
            const targetEmbedding = await embeddingUtil.generateEmbedding(outputText);
            const contextEmbeddings = await embeddingUtil.generateEmbeddings(contextStrings);

            if (!targetEmbedding || !contextEmbeddings) {
                logger.error('Failed to generate embeddings for relevance calculation.');
                return 0.3; // Return very low score on embedding failure
            }

            // Using the 'Max' strategy for relevance score
            const relevanceScore = calculateRelevanceScore(targetEmbedding, contextEmbeddings);
            return relevanceScore;

        } catch (error) {
            logger.error('Error calculating semantic relevance:', error);
            return 0.3; // Return very low score on error
        }
    }

    private calculateResourceEfficiency(): number {
        // No changes needed here
        const metrics = {
            processingTime: this.getAverageProcessingTime(),
            memoryUsage: process.memoryUsage().heapUsed
        };
        const maxMemory = 1024 * 1024 * 200; // 200MB
        const targetTime = 2000; // 2s
        const memoryScore = 1 - (metrics.memoryUsage / maxMemory);
        const timeScore = 1 - (metrics.processingTime / targetTime);
        return Math.min(1, (memoryScore + timeScore) / 2);
    }

    // REMOVED - No longer needed as calculateContextRelevance handles context gathering
    // private getExpectedContext(): string[] { ... }

    // REMOVED - No longer needed as calculateContextRelevance handles context gathering
    // private extractContextKeywords(text: string): string[] { ... }

    private buildDependencyChain(data: Record<string, unknown>): string[] {
        // No changes needed here
        const chain: string[] = [];
        if (data.branchFromThought) {
            chain.push(`Branch from thought ${data.branchFromThought}`);
        }
        if (data.revisesThought) {
            chain.push(`Revises thought ${data.revisesThought}`);
        }
        if (data.branchId) {
            const branchHistory = this.branches[data.branchId as string];
            if (branchHistory) {
                chain.push(`Branch ${data.branchId} history: ${branchHistory.length} thoughts`);
            }
        }
        return chain;
    }

    private formatThought(thoughtData: SequentialThoughtData): string {
        // No changes needed here
        const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, branchFromThought, branchId, category, confidence } = thoughtData;
        let prefix = '';
        let context = '';
        let confidenceStr = confidence ? ` (${(confidence * 100).toFixed(1)}% confidence)` : '';
        let categoryStr = category ? ` [${category.type}]` : '';

        if (isRevision) {
            prefix = chalk.yellow('🔄 Revision');
            context = ` (revising thought ${revisesThought})`;
        } else if (branchFromThought) {
            prefix = chalk.green('🌿 Branch');
            context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
        } else {
            prefix = chalk.blue('💭 Thought');
            context = '';
        }

        const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}${categoryStr}${confidenceStr}`;
        const border = '─'.repeat(Math.max(header.length, thought.length) + 4);
        let metricsStr = '';
        if (this.debugConfig.metricTracking && thoughtData.metrics) {
            metricsStr = `\n│ Processing Time: ${thoughtData.metrics.processingTime.toFixed(2)}ms │\n│ Memory Usage: ${(thoughtData.metrics.resourceUsage / 1024 / 1024).toFixed(2)}MB │`;
        }

        return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │${metricsStr}
└${border}┘`;
    }

    private initializeThought(input: Record<string, unknown>): ThoughtInitialization {
        // No changes needed here
        const problemScope = input.thought as string;
        const estimatedThoughts = input.totalThoughts as number;
        const sanitizedContext = sanitizeContext(input.context);
        const contextConfidence = getContextConfidence(sanitizedContext);
        const initialization: ThoughtInitialization = {
            problemScope,
            estimatedThoughts,
            initialParameters: {
                maxDepth: this.config.maxDepth,
                contextWindow: this.config.contextWindow,
                confidenceThreshold: Math.max(
                    this.config.confidenceThreshold,
                    contextConfidence
                )
            },
            assumptions: sanitizedContext.assumptions || [],
            constraints: sanitizedContext.constraints || []
        };
        return initialization;
    }

    private updateProcessingState(phase: ProcessingState['currentPhase'], data: SequentialThoughtData): void {
        // No changes needed here
        this.processingState.currentPhase = phase;
        this.processingState.completedSteps = this.thoughtHistory.length;
        this.processingState.estimatedRemainingSteps = data.totalThoughts - this.thoughtHistory.length;
        if (this.config.parallelTasks) {
            this.processingState.activeThreads = this.parallelTasks.size;
        }
        if (data.branchId && !this.processingState.pendingBranches.includes(data.branchId)) {
            this.processingState.pendingBranches.push(data.branchId);
        }
    }

    private adaptProcessing(data: SequentialThoughtData): DynamicAdaptation {
        // No changes needed here
        const adaptation: DynamicAdaptation = {
            contextBasedAdjustments: {},
            resourceOptimization: {
                memoryUsage: process.memoryUsage().heapUsed,
                processingTime: data.metrics?.processingTime || 0,
                recommendedAdjustments: []
            },
            performanceMetrics: {
                averageProcessingTime: this.getAverageProcessingTime(),
                successRate: this.calculateSuccessRate(),
                branchingEfficiency: this.calculateBranchingEfficiency()
            }
        };
        if (adaptation.performanceMetrics.successRate < 0.7) {
            adaptation.contextBasedAdjustments.confidenceThreshold =
                Math.min(this.config.confidenceThreshold + 0.05, 1);
            this.logAdaptation('Increased confidence threshold due to low success rate');
        }
        if (adaptation.performanceMetrics.averageProcessingTime > 1000) {
            adaptation.contextBasedAdjustments.parallelProcessing = false;
            this.logAdaptation('Disabled parallel processing due to high processing time');
        }
        if (adaptation.resourceOptimization.memoryUsage > 1024 * 1024 * 100) { // 100MB
            adaptation.resourceOptimization.recommendedAdjustments?.push(
                'Consider reducing context window size'
            );
            this.logAdaptation('High memory usage detected');
        }
        return adaptation;
    }

    private logAdaptation(reason: string): void {
        // No changes needed here
        this.processingState.adaptationHistory.push({
            timestamp: Date.now(),
            adjustment: this.processingState.currentPhase,
            reason
        });
    }

    private calculateSuccessRate(): number {
        // No changes needed here
        if (this.thoughtHistory.length === 0) return 1;
        const successfulThoughts = this.thoughtHistory.filter(t =>
            t.confidence && t.confidence >= this.config.confidenceThreshold
        ).length;
        return successfulThoughts / this.thoughtHistory.length;
    }

    private calculateBranchingEfficiency(): number {
        // No changes needed here
        if (Object.keys(this.branches).length === 0) return 1;
        const completedBranches = Object.values(this.branches)
            .filter(branch => {
                const lastThought = branch[branch.length - 1];
                return lastThought?.confidence !== undefined &&
                    lastThought.confidence >= this.config.confidenceThreshold;
            }).length;
        return completedBranches / Object.keys(this.branches).length;
    }

    // Note: processThought might need to become async if validateData becomes async
    public async processThought(input: unknown): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> { // Made async
        try {
            // validateData is now async
            const validatedInput = await this.validateData(input); // Added await

            // Initialize thought if in initialization phase
            if (this.processingState.currentPhase === 'initialization') {
                const initialization = this.initializeThought(validatedInput as unknown as Record<string, unknown>);
                const metrics: ThoughtMetrics = {
                    processingTime: performance.now(), // Use current time? Or validatedInput.metrics.processingTime?
                    resourceUsage: process.memoryUsage().heapUsed,
                    dependencyChain: [],
                    initialization
                };
                // Overwrite metrics from validateData? Let's keep validateData's metrics for now.
                // validatedInput.metrics = metrics;
                this.updateProcessingState('processing', validatedInput);
            }

            // Apply dynamic adaptation
            const adaptation = this.adaptProcessing(validatedInput);
            // Combine metrics carefully
            const currentMetrics = validatedInput.metrics || { processingTime: 0, resourceUsage: 0, dependencyChain: [] };
            const metrics: ThoughtMetrics = {
                ...currentMetrics, // Keep timing/resource usage from validateData
                initialization: validatedInput.metrics?.initialization, // Keep initialization if present
                dynamicAdaptation: adaptation,
                processingState: this.processingState
            };
            validatedInput.metrics = metrics;

            // Continue with existing processing
            this.categorizeThought(validatedInput);
            this.updateProgressMetrics(validatedInput);

            if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
                validatedInput.totalThoughts = validatedInput.thoughtNumber;
            }

            // Track thought in history
            this.thoughtHistory.push(validatedInput);

            // Handle branching
            if (validatedInput.branchFromThought && validatedInput.branchId) {
                if (!this.config.branchingEnabled) {
                    throw new Error('Branching is disabled in current configuration');
                }
                if (!this.branches[validatedInput.branchId]) {
                    this.branches[validatedInput.branchId] = [];
                }
                this.branches[validatedInput.branchId].push(validatedInput);
            }

            // Update phase if this is the last thought
            if (validatedInput.thoughtNumber === validatedInput.totalThoughts) {
                this.updateProcessingState('completion', validatedInput);
            }

            // Format and output thought
            const formattedThought = this.formatThought(validatedInput);
            logger.error(formattedThought); // Should this be info or debug?

            // Generate response with enhanced metrics
            // Package the validated data, potentially filtering based on verbosity later
            const responsePayload: SequentialThoughtData = { ...validatedInput };

            // Add summary if needed
            let summary: string | undefined = undefined;
            if (this.enhancementConfig.enableSummarization &&
                validatedInput.thoughtNumber === validatedInput.totalThoughts) {
                summary = this.summarizeThoughtChain();
                // How to add summary to response? Add a summary field?
            }

            // Construct final response object based on needs (maybe filter later)
            const response = {
                ...responsePayload, // Includes thought, numbers, category, confidence, context, metrics
                summary: summary, // Add summary if generated
                // Add other high-level info if needed
                branches: Object.keys(this.branches),
                thoughtHistoryLength: this.thoughtHistory.length,
            };


            return {
                content: [{
                    type: "text",
                    // Return the structured data, not just a subset
                    text: JSON.stringify(response, null, 2)
                }]
            };
        } catch (error) {
            logger.error("Error processing thought:", error); // Log the error
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        error: error instanceof Error ? error.message : String(error),
                        status: 'failed'
                    }, null, 2)
                }],
                isError: true
            };
        }
    }

    private getAverageProcessingTime(): number {
        // No changes needed here
        if (this.processingTimes.length === 0) return 0;
        const sum = this.processingTimes.reduce((a: number, b: number) => a + b, 0);
        return sum / this.processingTimes.length;
    }

    private async processParallelThoughts(thoughts: SequentialThoughtData[]): Promise<Array<{ content: Array<{ type: string; text: string }>; isError?: boolean }>> {
        // No changes needed here, assuming processThought is now async
        if (!this.config.parallelTasks) {
            // Need to handle async now
            const results = [];
            for (const thought of thoughts) {
                results.push(await this.processThought(thought));
            }
            return results;
            // return thoughts.map(thought => this.processThought(thought)); // Old sync way
        }

        const tasks = thoughts.map(async thought => {
            const taskId = `thought-${thought.thoughtNumber}-${Date.now()}`;
            // processThought is now async
            const task = this.processThought(thought);
            this.parallelTasks.set(taskId, task); // Store the promise

            try {
                const result = await task;
                this.parallelTasks.delete(taskId);
                return result;
            } catch (error) {
                this.parallelTasks.delete(taskId);
                // Rethrow or handle error appropriately
                logger.error(`Parallel thought task ${taskId} failed:`, error);
                // Return an error structure consistent with processThought's error return
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            error: error instanceof Error ? error.message : String(error),
                            status: 'failed',
                            taskId: taskId
                        }, null, 2)
                    }],
                    isError: true
                };
            }
        });

        return Promise.all(tasks);
    }

    private categorizeThought(thought: SequentialThoughtData): void {
        // No changes needed here
        if (!this.enhancementConfig.thoughtCategorization || !thought.thought) {
            return;
        }
        const categories = {
            analysis: ['analyze', 'examine', 'investigate', 'study', 'review'],
            hypothesis: ['assume', 'predict', 'suggest', 'might', 'could'],
            verification: ['verify', 'test', 'validate', 'check', 'confirm'],
            revision: ['revise', 'update', 'modify', 'change', 'adjust'],
            solution: ['solve', 'implement', 'fix', 'resolve', 'complete']
        };
        const thoughtText = thought.thought.toLowerCase();
        let maxMatches = 0;
        let bestCategory: keyof typeof categories | undefined;
        for (const [category, keywords] of Object.entries(categories)) {
            const matches = keywords.filter(keyword => thoughtText.includes(keyword)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                bestCategory = category as keyof typeof categories;
            }
        }
        if (bestCategory) {
            thought.category = {
                type: bestCategory,
                confidence: maxMatches / Math.max(thoughtText.split(' ').length, 1)
            };
        }
    }

    private updateProgressMetrics(thought: SequentialThoughtData): void {
        // No changes needed here
        if (!this.enhancementConfig.progressTracking) {
            return;
        }
        this.progressMetrics.completedThoughts++;
        this.progressMetrics.totalExpectedThoughts = Math.max(
            this.progressMetrics.totalExpectedThoughts,
            thought.totalThoughts
        );
        const now = Date.now();
        const timeDiff = now - this.progressMetrics.lastUpdateTime;
        if (timeDiff >= 1000) { // Update rate every second
            this.progressMetrics.processingRate =
                (this.progressMetrics.completedThoughts * 1000) / (now - this.progressMetrics.startTime);
            this.progressMetrics.lastUpdateTime = now;
        }
    }

    private summarizeThoughtChain(): string {
        // No changes needed here
        if (!this.enhancementConfig.enableSummarization || this.thoughtHistory.length === 0) {
            return '';
        }
        const summary = {
            totalThoughts: this.thoughtHistory.length,
            branches: Object.keys(this.branches).length,
            categories: new Map<string, number>(),
            averageConfidence: 0,
            keyInsights: new Set<string>()
        };
        let totalConfidence = 0;
        let confidenceCount = 0;
        this.thoughtHistory.forEach(thought => {
            if (thought.category) {
                const count = summary.categories.get(thought.category.type) || 0;
                summary.categories.set(thought.category.type, count + 1);
            }
            if (thought.confidence !== undefined) {
                totalConfidence += thought.confidence;
                confidenceCount++;
            }
            if (thought.category?.confidence && thought.category.confidence > 0.8) {
                summary.keyInsights.add(thought.thought);
            }
        });
        summary.averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
        return `
Chain Summary:
- Total Thoughts: ${summary.totalThoughts}
- Active Branches: ${summary.branches}
- Average Confidence: ${(summary.averageConfidence * 100).toFixed(1)}%
- Category Distribution:
${Array.from(summary.categories.entries())
                .map(([category, count]) => `  * ${category}: ${count}`)
                .join('\n')}
- Key Insights:
${Array.from(summary.keyInsights)
                .slice(0, 3)
                .map(insight => `  * ${insight}`)
                .join('\n')}`;
    }
}
