import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAME, TOOL_PARAMS, TOOL_DESCRIPTION } from "./chainOfDraftParams.js";
import { ChainOfDraftService } from "../services/index.js";
import { DraftConfig, EnhancementConfig, DebugConfig, DraftData } from "../types/chainOfDraft.js";
import { logger } from '../utils/index.js'; // +++ Added logger import

// Service instance with configuration
import { StorageService } from '../services/StorageService.js'; // +++ Import StorageService

// Service instance with configuration
let chainOfDraftService: ChainOfDraftService | null = null;

// +++ Modify function signature to accept StorageService +++
export const draftTool = (server: McpServer, storageService: StorageService, config?: {
    core?: Partial<DraftConfig>;
    enhancement?: Partial<EnhancementConfig>;
    debug?: Partial<DebugConfig>;
}): void => {
    // Initialize service with configuration and StorageService
    chainOfDraftService = new ChainOfDraftService(
        storageService, // +++ Pass storageService
        config?.core || {},
        config?.enhancement || {},
        config?.debug || {}
    );

    // +++ Modified signature to accept sessionId
    const processDraft = async (input: Record<string, unknown>, sessionId: string) => {
        if (!chainOfDraftService) {
            throw new McpError(
                ErrorCode.InternalError,
                'Chain of Draft service not initialized'
            );
        }

        try {
            // Transform input to match our interface
            const transformedInput: Partial<DraftData> = {
                content: input.content as string,
                draftNumber: input.draftNumber as number,
                totalDrafts: input.totalDrafts as number,
                needsRevision: input.needsRevision as boolean,
                nextStepNeeded: input.nextStepNeeded as boolean,
                isRevision: input.isRevision as boolean | undefined,
                revisesDraft: input.revisesDraft as number | undefined,
                isCritique: input.isCritique as boolean | undefined,
                critiqueFocus: input.critiqueFocus as string | undefined,
                reasoningChain: input.reasoningChain as string[] | undefined,
                category: input.category as DraftData['category'],
                confidence: input.confidence as number | undefined,
                context: input.context as DraftData['context'],
                metrics: input.metrics as DraftData['metrics']
            };

            // +++ Pass sessionId down
            return chainOfDraftService.processDraft(transformedInput, sessionId);
        } catch (error) {
            throw new McpError(
                ErrorCode.InvalidParams,
                error instanceof Error ? error.message : 'Unknown error processing draft'
            );
        }
    }

    server.tool(
        TOOL_NAME,
        TOOL_DESCRIPTION,
        TOOL_PARAMS,
        async (args, extra) => { // 'extra' contains MCP context like sessionId
            const sessionId = extra?.sessionId || 'default_session'; // Extract sessionId, provide default
            logger.info('Handling chainOfDraftTool request', { sessionId }); // Log session ID
            try {
                // +++ Pass sessionId to processDraft
                const result = await processDraft(args, sessionId);
                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(result) // Use the result directly
                    }]
                };
            } catch (error) {
                logger.error('Error processing chainOfDraftTool request', error, { sessionId }); // Log error with session ID
                if (error instanceof McpError) {
                    throw error;
                }
                throw new McpError(
                    ErrorCode.InternalError,
                    'Failed to process chain of draft request'
                );
            }
        }
    );
}
