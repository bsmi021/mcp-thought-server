import { createServer } from "./initialize.js";
import { join } from "path";
import { fileURLToPath } from "url";
import { logger } from "./utils/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(fileURLToPath(import.meta.url), '..');

const server = createServer();

const main = async () => {
    try {

        const transport = new StdioServerTransport();

        await server.connect(transport);
    } catch (error) {
        logger.error("Failed to start server:", error);
    }
}

main();
