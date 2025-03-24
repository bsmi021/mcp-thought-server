import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { thinkingTool as registerThinkingTool } from "./sequentialThinkingTool.js";
import { SequentialThinkingService } from "../services/index.js";

export const registerTools = (server: McpServer, sequentialThinkingService: SequentialThinkingService): void => {
    registerThinkingTool(server, sequentialThinkingService);
}