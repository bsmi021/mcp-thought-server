import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAME, TOOL_PARAMS, TOOL_DESCRIPTION } from "../tools/sequentialThinkingParams.js";
import { SequentialThinkingService } from "../services/index.js";

export const thinkingTool = (server: McpServer, SequentialThinkingService: SequentialThinkingService): void => {

    const processThought = async (input: unknown) => {
        const result = SequentialThinkingService.processThought(input);

        return result;
    }

    server.tool(
        TOOL_NAME,
        TOOL_DESCRIPTION,
        TOOL_PARAMS,
        async (args, extra) => {
            const sessionId = extra.sessionId || 'default';
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(await processThought(args))
                }]
            };
        }
    );

}