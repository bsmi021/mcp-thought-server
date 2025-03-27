import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { thinkingTool } from "./sequentialThinkingTool.js";
import { draftTool } from "./chainOfDraftTool.js";
import { integratedTool } from "./integratedTool.js";
import { setFeatureTool } from "./setFeatureTool.js";
import { ConfigurationManager } from "../config/ConfigurationManager.js";
import { DebugControlService } from "../services/DebugControlService.js";

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: McpServer): void {
    registerThinkingTool(server);
    registerDraftTool(server);
    registerIntegratedTool(server);
    setFeatureTool(server);
}

function registerThinkingTool(server: McpServer): void {
    const configManager = ConfigurationManager.getInstance();
    const debugControl = DebugControlService.getInstance();
    const coreConfig = configManager.getCoreConfig();
    const enhancementConfig = {
        enableSummarization: true,
        thoughtCategorization: true,
        progressTracking: true,
        dynamicAdaptation: true
    };

    thinkingTool(server, {
        core: coreConfig,
        enhancement: enhancementConfig,
        debug: debugControl.getDebugState()
    });
}

function registerDraftTool(server: McpServer): void {
    const configManager = ConfigurationManager.getInstance();
    const debugControl = DebugControlService.getInstance();
    const draftConfig = configManager.getDraftConfig();
    const enhancementConfig = {
        enableSummarization: true,
        draftCategorization: true,
        progressTracking: true,
        dynamicAdaptation: true
    };

    draftTool(server, {
        core: draftConfig,
        enhancement: enhancementConfig,
        debug: debugControl.getDebugState()
    });
}

function registerIntegratedTool(server: McpServer): void {
    const configManager = ConfigurationManager.getInstance();
    const debugControl = DebugControlService.getInstance();
    const integratedConfig = configManager.getIntegratedConfig();

    integratedTool(server, {
        draftConfig: integratedConfig.draftConfig,
        sequentialConfig: integratedConfig.sequentialConfig,
        enhancementConfig: integratedConfig.enhancementConfig,
        debugConfig: debugControl.getDebugState(),
        mcpConfig: {
            serverUrl: process.env.MCP_SERVER_URL || "http://localhost:3000",
            apiKey: process.env.MCP_API_KEY || "default-key",
            maxRetries: 3,
            timeout: 5000,
            features: {
                sequentialThinking: true,
                draftProcessing: true,
                parallelProcessing: true,
                monitoring: debugControl.getDebugState().performanceMonitoring
            }
        }
    });
}