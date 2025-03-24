import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAME, TOOL_PARAMS, TOOL_DESCRIPTION } from "./sequentialThinkingParams.js";
import { SequentialThinkingService } from "../services/index.js";
import { CoreConfig, EnhancementConfig, DebugConfig } from "../types/index.js";

// Service instance with configuration
let sequentialThinkingService: SequentialThinkingService | null = null;

export const thinkingTool = (server: McpServer, config?: {
    core?: Partial<CoreConfig>;
    enhancement?: Partial<EnhancementConfig>;
    debug?: Partial<DebugConfig>;
}): void => {
    // Initialize service with configuration if provided
    sequentialThinkingService = new SequentialThinkingService(
        config?.core || {},
        config?.enhancement || {},
        config?.debug || {}
    );

    const processThought = async (input: unknown) => {
        if (!sequentialThinkingService) {
            throw new McpError(
                ErrorCode.InternalError,
                'Sequential thinking service not initialized'
            );
        }

        try {
            return sequentialThinkingService.processThought(input);
        } catch (error) {
            throw new McpError(
                ErrorCode.InvalidParams,
                error instanceof Error ? error.message : 'Unknown error processing thought'
            );
        }
    }

    server.tool(
        TOOL_NAME,
        TOOL_DESCRIPTION,
        TOOL_PARAMS,
        async (args, extra) => {
            try {
                const sessionId = extra.sessionId || 'default';
                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(await processThought(args))
                    }]
                };
            } catch (error) {
                if (error instanceof McpError) {
                    throw error;
                }
                throw new McpError(
                    ErrorCode.InternalError,
                    'Failed to process sequential thinking request'
                );
            }
        }
    );
}