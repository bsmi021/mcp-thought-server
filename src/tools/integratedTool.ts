import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAME, TOOL_PARAMS, TOOL_DESCRIPTION } from "./integratedParams.js";
import { IntegratedThinkingService } from "../services/index.js";
import { IntegratedConfig } from "../types/integrated.js";
import { logger } from '../utils/index.js';

// Service instance with configuration
import { StorageService } from '../services/StorageService.js'; // +++ Import StorageService

// Service instance with configuration
let integratedService: IntegratedThinkingService | null = null;

// +++ Modify function signature to accept StorageService +++
export const integratedTool = (server: McpServer, storageService: StorageService, config?: Partial<IntegratedConfig>): void => {
    // Initialize service with configuration and StorageService
    integratedService = new IntegratedThinkingService(config as IntegratedConfig, storageService); // +++ Pass storageService

    // +++ Modified signature to accept sessionId
    const processIntegrated = async (input: Record<string, unknown>, sessionId: string) => {
        if (!integratedService) {
            throw new McpError(
                ErrorCode.InternalError,
                'Integrated Thinking service not initialized'
            );
        }

        try {
            // Pre-process input to handle missing parameters with intelligent defaults
            const thoughtNumber = input.thoughtNumber as number || 1;
            const totalThoughts = Math.max(4, input.totalThoughts as number || thoughtNumber + 1);

            const processedInput = {
                ...input,
                // Required parameters with defaults
                thoughtNumber,
                totalThoughts,
                draftNumber: input.draftNumber || thoughtNumber,
                totalDrafts: input.totalDrafts || totalThoughts,
                needsRevision: input.needsRevision ?? false,
                nextStepNeeded: input.nextStepNeeded ?? (thoughtNumber < totalThoughts),

                // Handle category defaults
                category: input.category || {
                    type: thoughtNumber === 1 ? 'initial' :
                        thoughtNumber === totalThoughts ? 'final' :
                            thoughtNumber % 2 === 0 ? 'critique' : 'revision',
                    confidence: thoughtNumber === totalThoughts ? 0.9 :
                        thoughtNumber === 1 ? 0.6 : 0.7
                },

                // Initialize empty context if missing
                context: input.context || {
                    problemScope: "",
                    assumptions: [],
                    constraints: []
                },

                // Default MCP features
                mcpFeatures: {
                    sequentialThinking: true,
                    draftProcessing: true,
                    monitoring: true,
                    ...(input.mcpFeatures || {})
                }
            };

            // Log parameter processing if debug is enabled
            if (config?.debugConfig?.metricTracking) {
                logger.debug('Integrated thinking parameter processing:', {
                    original: input,
                    processed: processedInput
                });
            }

            // Validate input against schema
            const validatedInput = z.object(TOOL_PARAMS).parse(processedInput);

            // Add explicit category type validation
            if (validatedInput.category?.type && !['initial', 'critique', 'revision', 'final'].includes(validatedInput.category.type)) {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    `Invalid category type "${validatedInput.category.type}". Valid types are: 'initial', 'critique', 'revision', 'final'. Note: Terms like 'analysis', 'hypothesis', 'evaluation', 'conclusion' are descriptions of stages but not valid category types.`
                );
            }

            // Enforce minimum iterations and proper stage progression
            if (validatedInput.thoughtNumber === 1 && validatedInput.category?.type !== 'initial') {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    `First thought must be 'initial' stage. Got: ${validatedInput.category?.type}`
                );
            }

            // Validate stage progression
            if (validatedInput.category?.type === 'final' && validatedInput.thoughtNumber && validatedInput.totalThoughts &&
                validatedInput.thoughtNumber < validatedInput.totalThoughts) {
                // Suggest a more appropriate category based on whether it's likely a critique or revision step
                const suggestedCategory = validatedInput.thoughtNumber % 2 === 0 ? 'critique' : 'revision'; // Simple heuristic
                throw new McpError(
                    ErrorCode.InvalidParams,
                    `Cannot use category.type 'final' (thought ${validatedInput.thoughtNumber}) until the last thought (thought ${validatedInput.totalThoughts}). Consider using '${suggestedCategory}' or another appropriate intermediate type.`
                );
            }

            // Validate revision parameters
            if (validatedInput.isRevision && !validatedInput.revisesDraft) {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    'revisesDraft parameter is required when isRevision is true'
                );
            }

            if (validatedInput.isRevision && validatedInput.revisesDraft && validatedInput.draftNumber &&
                validatedInput.revisesDraft >= validatedInput.draftNumber) {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    `revisesDraft (${validatedInput.revisesDraft}) must be less than current draftNumber (${validatedInput.draftNumber})`
                );
            }

            // Validate critique parameters
            if (validatedInput.category?.type === 'critique' && !validatedInput.isCritique) {
                validatedInput.isCritique = true;
            }

            // Transform input to match our interface
            const transformedInput = {
                content: validatedInput.content,
                thoughtNumber: validatedInput.thoughtNumber as number,
                totalThoughts: validatedInput.totalThoughts as number,
                draftNumber: validatedInput.draftNumber as number,
                totalDrafts: validatedInput.totalDrafts as number,
                needsRevision: validatedInput.needsRevision as boolean,
                nextStepNeeded: validatedInput.nextStepNeeded as boolean,
                isRevision: validatedInput.isRevision,
                revisesDraft: validatedInput.revisesDraft,
                isCritique: validatedInput.isCritique,
                critiqueFocus: validatedInput.critiqueFocus,
                reasoningChain: validatedInput.reasoningChain,
                category: validatedInput.category,
                // confidence: validatedInput.confidence, // Removed - Use category.confidence
                context: validatedInput.context,
                mcpFeatures: validatedInput.mcpFeatures
            };

            // Process the integrated thought
            // +++ Pass sessionId down
            const result = await integratedService.processIntegratedThought(transformedInput, sessionId);

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
        async (args, extra) => { // 'extra' contains MCP context like sessionId
            const sessionId = extra?.sessionId || 'default_session'; // Extract sessionId, provide default
            logger.info(`Handling integratedTool request for session: ${sessionId}`); // Log session ID
            try {
                // +++ Pass sessionId to processIntegrated
                const result = await processIntegrated(args, sessionId);
                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(result) // Use the result directly
                    }]
                };
            } catch (error) {
                logger.error(`Error processing integratedTool for session ${sessionId}:`, error); // Log error with session ID
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
