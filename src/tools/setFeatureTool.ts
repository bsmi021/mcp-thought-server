import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { DebugControlService } from "../services/DebugControlService.js";
import { DebugFeature } from "../types/debugControl.js";
import { logger } from "../utils/index.js";

// Define parameter type
type SetFeatureParams = {
    feature: DebugFeature;
    enabled: boolean;
};

// Tool name and description
const TOOL_NAME = "setFeature";
const TOOL_DESCRIPTION = "Set a debug feature's enabled state";

// Parameter schema
const TOOL_PARAMS = {
    feature: z.enum(['errorCapture', 'metricTracking', 'performanceMonitoring', 'mcpDebug']).describe("The name of the feature to set"),
    enabled: z.boolean().describe("Whether to enable or disable the feature")
};

/**
 * Register the setFeature tool with an MCP server
 * @param server - The MCP server instance
 */
export const setFeatureTool = (server: McpServer): void => {
    server.tool(
        TOOL_NAME,
        TOOL_DESCRIPTION,
        TOOL_PARAMS,
        async (params: SetFeatureParams) => {
            try {
                const debugControl = DebugControlService.getInstance();
                const result = debugControl.setFeature(params.feature, params.enabled);

                logger.info('Debug feature status updated', { feature: params.feature, enabled: params.enabled });

                return {
                    content: [{
                        type: "text" as const,
                        text: `Debug feature '${params.feature}' ${params.enabled ? 'enabled' : 'disabled'}. Current state:\n${JSON.stringify(result, null, 2)}`
                    }]
                };
            } catch (error) {
                logger.error('Error in setFeature tool', error);

                if (error instanceof McpError) {
                    throw error;
                }

                throw new McpError(
                    ErrorCode.InternalError,
                    error instanceof Error ? error.message : 'Failed to set feature'
                );
            }
        }
    );
};
