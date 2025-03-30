import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAME, TOOL_PARAMS, TOOL_DESCRIPTION } from "./integratedParams.js";
import { IntegratedThinkingService } from "../services/index.js";
import { IntegratedConfig } from "../types/integrated.js";
import { logger } from '../utils/index.js';

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
                throw new McpError(
                    ErrorCode.InvalidParams,
                    `Cannot use 'final' stage before last thought. Current: ${validatedInput.thoughtNumber}, Total: ${validatedInput.totalThoughts}`
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
