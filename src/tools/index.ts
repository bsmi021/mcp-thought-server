import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { thinkingTool } from "./sequentialThinkingTool.js";
import { draftTool } from "./chainOfDraftTool.js";
import { integratedTool } from "./integratedTool.js";
import { setFeatureTool } from "./setFeatureTool.js";
import { ConfigurationManager } from "../config/ConfigurationManager.js";
import { DebugControlService } from "../services/DebugControlService.js";
import { StorageService } from "../services/StorageService.js"; // +++ Import StorageService

/**
 * Register all tools with the MCP server, passing the StorageService instance.
 */
// +++ Modify signature to accept StorageService +++
export function registerTools(server: McpServer, storageService: StorageService): void {
    registerThinkingTool(server); // Doesn't need storage yet
    registerDraftTool(server, storageService); // +++ Pass storageService
    registerIntegratedTool(server, storageService); // +++ Pass storageService
    setFeatureTool(server); // Doesn't need storage
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

// +++ Modify signature to accept StorageService +++
function registerDraftTool(server: McpServer, storageService: StorageService): void {
    const configManager = ConfigurationManager.getInstance();
    const debugControl = DebugControlService.getInstance();
    const draftConfig = configManager.getDraftConfig();
    const enhancementConfig = {
        enableSummarization: true,
        draftCategorization: true,
        progressTracking: true,
        dynamicAdaptation: true
    };

    // +++ Pass storageService to draftTool +++
    draftTool(server, storageService, {
        core: draftConfig,
        enhancement: enhancementConfig,
        debug: debugControl.getDebugState()
    });
}

// +++ Modify signature to accept StorageService +++
function registerIntegratedTool(server: McpServer, storageService: StorageService): void {
    const configManager = ConfigurationManager.getInstance();
    const debugControl = DebugControlService.getInstance();
    const integratedConfig = configManager.getIntegratedConfig();

    // +++ Pass storageService to integratedTool +++
    integratedTool(server, storageService, {
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
