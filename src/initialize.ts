import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/index.js";
import { logger } from "./utils/index.js";
import { SequentialThinkingService } from "./services/index.js";

const serverConfig = {
    name: "thought-server",
    version: "1.0.0",
}

const capabilities = {
    capabilities: {
        tools: {}
    }
}

export const createServer = (): McpServer => {
    // Crate a new MCP server
    const server = new McpServer(
        serverConfig,
        capabilities
    );

    const sequentialThinkingService = new SequentialThinkingService();

    // set up error handler
    server.server.onerror = (error) => {
        logger.error("MCP server error:", error);
    }

    // register tools
    registerTools(server);

    return server;
}
