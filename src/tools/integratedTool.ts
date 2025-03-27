import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAME, TOOL_PARAMS, TOOL_DESCRIPTION } from "./integratedParams.js";
import { IntegratedThinkingService } from "../services/index.js";
import { IntegratedConfig, IntegratedResult } from "../types/integrated.js";

// Service instance with configuration
let integratedService: IntegratedThinkingService | null = null;

export const integratedTool = (server: McpServer, config?: Partial<IntegratedConfig>): void => {
    // Initialize service with configuration if provided
    integratedService = new IntegratedThinkingService(config as IntegratedConfig);

    const processIntegrated = async (input: Record<string, unknown>) => {
        if (!integratedService) {
            throw new McpError(
                ErrorCode.InternalError,
                'Integrated Thinking service not initialized'
            );
        }

        try {
            // Validate input against schema
            const validatedInput = z.object(TOOL_PARAMS).parse(input);

            // Transform input to match our interface
            const transformedInput = {
                content: validatedInput.content,
                thoughtNumber: validatedInput.thoughtNumber,
                totalThoughts: validatedInput.totalThoughts,
                draftNumber: validatedInput.draftNumber,
                totalDrafts: validatedInput.totalDrafts,
                needsRevision: validatedInput.needsRevision,
                nextStepNeeded: validatedInput.nextStepNeeded,
                isRevision: validatedInput.isRevision,
                revisesDraft: validatedInput.revisesDraft,
                isCritique: validatedInput.isCritique,
                critiqueFocus: validatedInput.critiqueFocus,
                reasoningChain: validatedInput.reasoningChain,
                category: validatedInput.category || {
                    type: 'initial',
                    confidence: validatedInput.confidence || 0.85
                },
                confidence: validatedInput.confidence,
                context: validatedInput.context,
                mcpFeatures: validatedInput.mcpFeatures
            };

            // Process the integrated thought
            const result = await integratedService.processIntegratedThought(transformedInput);

            // Validate the result
            const validatedResult = z.object({
                sequentialOutput: z.any(),
                draftOutput: z.any(),
                mcpEnhancements: z.any(),
                metrics: z.any(),
                category: z.object({
                    type: z.enum(['initial', 'critique', 'revision', 'final']),
                    confidence: z.number().min(0).max(1)
                }),
                context: z.record(z.unknown()).optional(),
                mcpFeatures: z.record(z.unknown()).optional()
            }).parse(result);

            return validatedResult;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`
                );
            }
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : 'Unknown error processing integrated thought'
            );
        }
    };

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
                        text: JSON.stringify(await processIntegrated(args))
                    }]
                };
            } catch (error) {
                if (error instanceof McpError) {
                    throw error;
                }
                throw new McpError(
                    ErrorCode.InternalError,
                    'Failed to process integrated thinking request'
                );
            }
        }
    );
}; 