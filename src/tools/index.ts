import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { thinkingTool } from "./sequentialThinkingTool.js";
import { DEFAULT_CONFIG, DEFAULT_ENHANCEMENT_CONFIG, DEFAULT_DEBUG_CONFIG } from "../services/SequentialThinkingService.js";

export function registerThinkingTool(server: McpServer): void {
    // Initialize with default configurations
    thinkingTool(server, {
        core: DEFAULT_CONFIG,
        enhancement: DEFAULT_ENHANCEMENT_CONFIG,
        debug: DEFAULT_DEBUG_CONFIG
    });
}