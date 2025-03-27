import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { thinkingTool } from "./sequentialThinkingTool.js";
import { draftTool } from "./chainOfDraftTool.js";
import { ConfigurationManager } from "../config/ConfigurationManager.js";
import { integratedTool } from "./integratedTool.js";

export function registerAllTools(server: McpServer): void {
    registerThinkingTool(server);
    registerDraftTool(server);
    registerIntegratedTool(server);
}

function registerThinkingTool(server: McpServer): void {
    const configManager = ConfigurationManager.getInstance();
    const coreConfig = configManager.getCoreConfig();
    const enhancementConfig = {
        enableSummarization: true,
        thoughtCategorization: true,
        progressTracking: true,
        dynamicAdaptation: true
    };
    const debugConfig = {
        errorCapture: true,
        metricTracking: true,
        performanceMonitoring: true
    };

    thinkingTool(server, {
        core: coreConfig,
        enhancement: enhancementConfig,
        debug: debugConfig
    });
}

function registerDraftTool(server: McpServer): void {
    const configManager = ConfigurationManager.getInstance();
    const draftConfig = configManager.getDraftConfig();
    const enhancementConfig = {
        enableSummarization: true,
        draftCategorization: true,
        progressTracking: true,
        dynamicAdaptation: true
    };
    const debugConfig = {
        errorCapture: true,
        metricTracking: true,
        performanceMonitoring: true
    };

    draftTool(server, {
        core: draftConfig,
        enhancement: enhancementConfig,
        debug: debugConfig
    });
}

function registerIntegratedTool(server: McpServer): void {
    const configManager = ConfigurationManager.getInstance();
    const integratedConfig = configManager.getIntegratedConfig();

    integratedTool(server, {
        draftConfig: integratedConfig.draftConfig,
        sequentialConfig: integratedConfig.sequentialConfig,
        enhancementConfig: integratedConfig.enhancementConfig,
        debugConfig: integratedConfig.debugConfig,
        mcpConfig: {
            serverUrl: process.env.MCP_SERVER_URL || "http://localhost:3000",
            apiKey: process.env.MCP_API_KEY || "default-key",
            maxRetries: 3,
            timeout: 5000,
            features: {
                sequentialThinking: true,
                draftProcessing: true,
                parallelProcessing: true,
                monitoring: true
            }
        }
    });
}