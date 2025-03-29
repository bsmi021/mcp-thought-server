import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/index.js";
import { logger } from "./utils/index.js";
import { SequentialThinkingService, PrototypingService } from "./services/index.js";
import { FeedbackLoopService } from "./services/feedback.js";
import { FeedbackOptimizationService } from "./services/optimization.js";
import feedbackConfig from "./config/feedback.js";

const serverConfig = {
    name: "thought-server",
    version: "1.0.0",
}

const capabilities = {
    capabilities: {
        tools: {},
        feedback: {
            enabled: true,
            config: feedbackConfig
        },
        prototyping: {
            enabled: true,
            config: {
                validation: {
                    minConfidence: 0.7,
                    autoValidate: true,
                },
                optimization: {
                    minConfidence: 0.8,
                    autoOptimize: true,
                },
                benchmarking: {
                    enabled: true,
                    interval: 3600000, // 1 hour
                },
            }
        }
    }
}

export const createServer = (): McpServer => {
    // Create a new MCP server
    const server = new McpServer(
        serverConfig,
        capabilities
    );

    // Initialize services
    const sequentialThinkingService = new SequentialThinkingService();
    const feedbackService = new FeedbackLoopService();
    const optimizationService = new FeedbackOptimizationService();
    const prototypingService = new PrototypingService();

    // Set up error handler
    server.server.onerror = (error) => {
        logger.error("MCP server error:", error);

        // Log error to feedback system
        feedbackService.collectFeedback(
            {
                id: crypto.randomUUID(),
                type: 'performance',
                component: 'server',
                priority: 1
            },
            {
                content: error,
                metrics: { severity: 1 },
                context: { timestamp: new Date().toISOString() }
            }
        ).catch(err => {
            logger.error("Failed to log error to feedback system:", err);
        });
    }

    // Start feedback monitoring if enabled
    if (feedbackConfig.monitoring.enabled) {
        const monitoringInterval = setInterval(async () => {
            try {
                const metrics = await feedbackService.monitorFeedbackEffects();
                const optimization = await optimizationService.optimizeFeedbackRoutes();

                if (optimization.confidence < feedbackConfig.analysis.minConfidence) {
                    await optimizationService.adjustFeedbackWeights(metrics);
                }
            } catch (error) {
                logger.error("Feedback monitoring error:", error);
            }
        }, feedbackConfig.monitoring.interval);

        // Clean up on server close
        server.server.onclose = () => {
            clearInterval(monitoringInterval);
        };
    }

    // Start prototype benchmarking if enabled
    if (capabilities.capabilities.prototyping.enabled &&
        capabilities.capabilities.prototyping.config.benchmarking.enabled) {
        const benchmarkingInterval = setInterval(async () => {
            try {
                // Get all prototypes and benchmark them
                const prototypes = Array.from(prototypingService['prototypes'].values());
                for (const prototype of prototypes) {
                    await prototypingService.benchmarkPrototype(prototype);
                }
            } catch (error) {
                logger.error("Prototype benchmarking error:", error);
            }
        }, capabilities.capabilities.prototyping.config.benchmarking.interval);

        // Clean up on server close
        const existingOnClose = server.server.onclose;
        server.server.onclose = () => {
            if (existingOnClose) existingOnClose();
            clearInterval(benchmarkingInterval);
        };
    }

    // Register tools
    registerTools(server);

    return server;
}
