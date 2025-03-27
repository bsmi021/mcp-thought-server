import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAME, TOOL_PARAMS, TOOL_DESCRIPTION } from "./chainOfDraftParams.js";
import { ChainOfDraftService } from "../services/index.js";
import { DraftConfig, EnhancementConfig, DebugConfig, DraftData } from "../types/chainOfDraft.js";

// Service instance with configuration
let chainOfDraftService: ChainOfDraftService | null = null;

export const draftTool = (server: McpServer, config?: {
    core?: Partial<DraftConfig>;
    enhancement?: Partial<EnhancementConfig>;
    debug?: Partial<DebugConfig>;
}): void => {
    // Initialize service with configuration if provided
    chainOfDraftService = new ChainOfDraftService(
        config?.core || {},
        config?.enhancement || {},
        config?.debug || {}
    );

    const processDraft = async (input: Record<string, unknown>) => {
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

            return chainOfDraftService.processDraft(transformedInput);
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
        async (args, extra) => {
            try {
                const sessionId = extra.sessionId || 'default';
                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(await processDraft(args))
                    }]
                };
            } catch (error) {
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