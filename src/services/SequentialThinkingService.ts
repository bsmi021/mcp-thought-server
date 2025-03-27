import { SequentialThoughtData, ThoughtCategory, CoreConfig, EnhancementConfig, DebugConfig, ProcessingState, ThoughtInitialization, DynamicAdaptation, ThoughtContext, ThoughtMetrics } from "../types/index.js";
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import chalk from "chalk";

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
    private readonly metrics: ThoughtMetrics;
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
            dependencyChain: []
        };
    }

    public validateData(input: unknown): SequentialThoughtData {
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

        // Calculate confidence using the new service
        const confidence = this.calculateThoughtConfidence(data);

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

    private calculateThoughtConfidence(data: Record<string, unknown>): number {
        const thought = data.thought as string;

        // Content quality score (0-1)
        const contentQuality = this.calculateContentQuality(thought);

        // Processing metrics score (0-1)
        const processingMetrics = {
            processingTime: this.getAverageProcessingTime(),
            errorRate: 1 - this.calculateSuccessRate(),
            resourceUsage: process.memoryUsage().heapUsed
        };
        const processingScore = this.calculateProcessingScore(processingMetrics);

        // Context relevance score (0-1)
        const context = {
            expected: this.getExpectedContext(),
            actual: this.extractContextKeywords(thought)
        };
        const contextScore = this.calculateContextRelevance(context);

        // Resource efficiency score (0-1)
        const resourceScore = this.calculateResourceEfficiency({
            memoryUsage: processingMetrics.resourceUsage,
            processingTime: processingMetrics.processingTime
        });

        // Weight the components
        const weights = {
            contentQuality: 0.35,
            processingScore: 0.25,
            contextScore: 0.25,
            resourceScore: 0.15
        };

        // Calculate weighted average
        const confidence = (
            contentQuality * weights.contentQuality +
            processingScore * weights.processingScore +
            contextScore * weights.contextScore +
            resourceScore * weights.resourceScore
        );

        // Apply adaptive threshold based on thought number
        const adaptiveThreshold = Math.max(
            0.4,  // Minimum threshold
            0.6 - (this.thoughtHistory.length * 0.02)  // Decreases as chain progresses
        );

        // Return adjusted confidence
        return Math.max(adaptiveThreshold, Math.min(0.95, confidence));
    }

    private calculateContentQuality(content: string): number {
        // Implement content quality metrics
        const hasStructure = content.includes('\n') || content.includes('.');
        const appropriateLength = content.length > 30 && content.length < 10000;
        const hasKeywords = this.hasRelevantKeywords(content);
        const complexity = this.calculateTextComplexity(content);

        let score = 0.5; // Base score

        if (hasStructure) score += 0.1;
        if (appropriateLength) score += 0.1;
        if (hasKeywords) score += 0.15;
        score += complexity * 0.15;

        return Math.min(1, score);
    }

    private hasRelevantKeywords(content: string): boolean {
        const keywords = ['analyze', 'consider', 'evaluate', 'examine', 'investigate', 'determine', 'conclude'];
        return keywords.some(keyword => content.toLowerCase().includes(keyword));
    }

    private calculateTextComplexity(content: string): number {
        const words = content.split(/\s+/).length;
        const sentences = content.split(/[.!?]+/).length;
        const avgWordsPerSentence = words / Math.max(1, sentences);

        // Score based on optimal sentence length (10-20 words)
        return Math.min(1, Math.max(0, 1 - Math.abs(15 - avgWordsPerSentence) / 15));
    }

    private calculateProcessingScore(metrics: { processingTime: number; errorRate: number; resourceUsage: number }): number {
        const timeScore = Math.min(1, 1000 / Math.max(1, metrics.processingTime));
        const errorScore = 1 - metrics.errorRate;
        const resourceScore = 1 - (metrics.resourceUsage / (1024 * 1024 * 100)); // Normalize to 100MB

        return (timeScore + errorScore + resourceScore) / 3;
    }

    private calculateContextRelevance(context: { expected: string[]; actual: string[] }): number {
        if (!context.expected.length || !context.actual.length) return 0.5;

        const matches = context.actual.filter(item =>
            context.expected.some(exp => item.toLowerCase().includes(exp.toLowerCase()))
        ).length;

        const coverage = matches / Math.max(context.expected.length, context.actual.length);

        // Add progressive bonus for thought chain context
        const chainBonus = Math.min(0.2, this.thoughtHistory.length * 0.02);

        return Math.min(1, coverage + chainBonus);
    }

    private calculateResourceEfficiency(metrics: { memoryUsage: number; processingTime: number }): number {
        const maxMemory = 1024 * 1024 * 100; // 100MB
        const targetTime = 1000; // 1s

        const memoryScore = 1 - (metrics.memoryUsage / maxMemory);
        const timeScore = 1 - (metrics.processingTime / targetTime);

        // Add efficiency bonus for parallel processing
        const parallelBonus = this.config.parallelTasks ? 0.1 : 0;

        return Math.min(1, ((memoryScore + timeScore) / 2) + parallelBonus);
    }

    private getExpectedContext(): string[] {
        // Extract expected context from thought history and current state
        const context: string[] = [];

        // Add problem scope if available
        if (this.thoughtHistory.length > 0 && this.thoughtHistory[0].context?.problemScope) {
            context.push(this.thoughtHistory[0].context.problemScope);
        }

        // Add recent thought keywords
        const recentThoughts = this.thoughtHistory.slice(-3);
        recentThoughts.forEach(thought => {
            if (thought.thought) {
                context.push(...this.extractContextKeywords(thought.thought));
            }
        });

        return Array.from(new Set(context)); // Remove duplicates
    }

    private extractContextKeywords(text: string): string[] {
        // Simple keyword extraction (can be enhanced with NLP)
        return text
            .toLowerCase()
            .split(/[\s,.!?]+/)
            .filter(word => word.length > 3) // Filter out short words
            .slice(0, 10); // Limit to top 10 keywords
    }

    private buildDependencyChain(data: Record<string, unknown>): string[] {
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

        // Add metrics if debug mode is enabled
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
        const problemScope = input.thought as string;
        const estimatedThoughts = input.totalThoughts as number;

        // Initialize with current configuration
        const initialization: ThoughtInitialization = {
            problemScope,
            estimatedThoughts,
            initialParameters: {
                maxDepth: this.config.maxDepth,
                contextWindow: this.config.contextWindow,
                confidenceThreshold: this.config.confidenceThreshold
            },
            assumptions: [],
            constraints: []
        };

        // Extract context if provided
        if (input.context) {
            const context = input.context as ThoughtContext;
            if (context.assumptions) initialization.assumptions = context.assumptions;
            if (context.constraints) initialization.constraints = context.constraints;
        }

        return initialization;
    }

    private updateProcessingState(phase: ProcessingState['currentPhase'], data: SequentialThoughtData): void {
        this.processingState.currentPhase = phase;
        this.processingState.completedSteps = this.thoughtHistory.length;
        this.processingState.estimatedRemainingSteps = data.totalThoughts - this.thoughtHistory.length;

        // Update active threads for parallel processing
        if (this.config.parallelTasks) {
            this.processingState.activeThreads = this.parallelTasks.size;
        }

        // Track pending branches
        if (data.branchId && !this.processingState.pendingBranches.includes(data.branchId)) {
            this.processingState.pendingBranches.push(data.branchId);
        }
    }

    private adaptProcessing(data: SequentialThoughtData): DynamicAdaptation {
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

        // Adjust confidence threshold based on success rate
        if (adaptation.performanceMetrics.successRate < 0.7) {
            adaptation.contextBasedAdjustments.confidenceThreshold =
                Math.min(this.config.confidenceThreshold + 0.05, 1);
            this.logAdaptation('Increased confidence threshold due to low success rate');
        }

        // Adjust parallel processing based on performance
        if (adaptation.performanceMetrics.averageProcessingTime > 1000) {
            adaptation.contextBasedAdjustments.parallelProcessing = false;
            this.logAdaptation('Disabled parallel processing due to high processing time');
        }

        // Optimize memory usage
        if (adaptation.resourceOptimization.memoryUsage > 1024 * 1024 * 100) { // 100MB
            adaptation.resourceOptimization.recommendedAdjustments?.push(
                'Consider reducing context window size'
            );
            this.logAdaptation('High memory usage detected');
        }

        return adaptation;
    }

    private logAdaptation(reason: string): void {
        this.processingState.adaptationHistory.push({
            timestamp: Date.now(),
            adjustment: this.processingState.currentPhase,
            reason
        });
    }

    private calculateSuccessRate(): number {
        if (this.thoughtHistory.length === 0) return 1;
        const successfulThoughts = this.thoughtHistory.filter(t =>
            t.confidence && t.confidence >= this.config.confidenceThreshold
        ).length;
        return successfulThoughts / this.thoughtHistory.length;
    }

    private calculateBranchingEfficiency(): number {
        if (Object.keys(this.branches).length === 0) return 1;

        const completedBranches = Object.values(this.branches)
            .filter(branch => {
                const lastThought = branch[branch.length - 1];
                return lastThought?.confidence !== undefined &&
                    lastThought.confidence >= this.config.confidenceThreshold;
            }).length;

        return completedBranches / Object.keys(this.branches).length;
    }

    public processThought(input: unknown): { content: Array<{ type: string; text: string }>; isError?: boolean } {
        try {
            const validatedInput = this.validateData(input);

            // Initialize thought if in initialization phase
            if (this.processingState.currentPhase === 'initialization') {
                const initialization = this.initializeThought(validatedInput as unknown as Record<string, unknown>);
                const metrics: ThoughtMetrics = {
                    processingTime: performance.now(),
                    resourceUsage: process.memoryUsage().heapUsed,
                    dependencyChain: [],
                    initialization
                };
                validatedInput.metrics = metrics;
                this.updateProcessingState('processing', validatedInput);
            }

            // Apply dynamic adaptation
            const adaptation = this.adaptProcessing(validatedInput);
            const metrics: ThoughtMetrics = {
                processingTime: validatedInput.metrics?.processingTime ?? performance.now(),
                resourceUsage: validatedInput.metrics?.resourceUsage ?? process.memoryUsage().heapUsed,
                dependencyChain: validatedInput.metrics?.dependencyChain ?? [],
                initialization: validatedInput.metrics?.initialization,
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
            console.error(formattedThought);

            // Generate response with enhanced metrics
            const response: any = {
                thoughtNumber: validatedInput.thoughtNumber,
                totalThoughts: validatedInput.totalThoughts,
                nextThoughtNeeded: validatedInput.nextThoughtNeeded,
                branches: Object.keys(this.branches),
                thoughtHistoryLength: this.thoughtHistory.length,
                progress: {
                    completedThoughts: this.progressMetrics.completedThoughts,
                    totalExpected: this.progressMetrics.totalExpectedThoughts,
                    processingRate: this.progressMetrics.processingRate,
                    currentPhase: this.processingState.currentPhase,
                    adaptationHistory: this.processingState.adaptationHistory
                }
            };

            if (this.enhancementConfig.enableSummarization &&
                validatedInput.thoughtNumber === validatedInput.totalThoughts) {
                response.summary = this.summarizeThoughtChain();
            }

            if (this.debugConfig.metricTracking) {
                response.metrics = {
                    ...validatedInput.metrics,
                    averageProcessingTime: this.getAverageProcessingTime(),
                    totalThoughts: this.thoughtHistory.length,
                    activeBranches: Object.keys(this.branches).length,
                    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
                    parallelTasks: this.parallelTasks.size
                };
            }

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(response, null, 2)
                }]
            };
        } catch (error) {
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
        if (this.processingTimes.length === 0) return 0;
        const sum = this.processingTimes.reduce((a: number, b: number) => a + b, 0);
        return sum / this.processingTimes.length;
    }

    private async processParallelThoughts(thoughts: SequentialThoughtData[]): Promise<Array<{ content: Array<{ type: string; text: string }>; isError?: boolean }>> {
        if (!this.config.parallelTasks) {
            return thoughts.map(thought => this.processThought(thought));
        }

        const tasks = thoughts.map(async thought => {
            const taskId = `thought-${thought.thoughtNumber}-${Date.now()}`;
            const task = Promise.resolve(this.processThought(thought));
            this.parallelTasks.set(taskId, task);

            try {
                const result = await task;
                this.parallelTasks.delete(taskId);
                return result;
            } catch (error) {
                this.parallelTasks.delete(taskId);
                throw error;
            }
        });

        return Promise.all(tasks);
    }

    private categorizeThought(thought: SequentialThoughtData): void {
        if (!this.enhancementConfig.thoughtCategorization || !thought.thought) {
            return;
        }

        // Analyze thought content for categorization
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
