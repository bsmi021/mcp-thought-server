import { z } from 'zod';
import { DebugFeature } from '../types/debugControl.js';

/**
 * Tool name for setting debug features
 */
export const TOOL_NAME = 'setFeature';

/**
 * Tool description for documentation
 */
export const TOOL_DESCRIPTION = 'Enable or disable debug features at runtime';

/**
 * Parameter schema for the setFeature tool
 * Validates feature name and enabled state
 */
export const TOOL_PARAMS = {
    type: 'object',
    properties: {
        feature: {
            type: 'string',
            description: 'The debug feature to modify (errorCapture, metricTracking, performanceMonitoring, mcpDebug)',
            enum: ['errorCapture', 'metricTracking', 'performanceMonitoring', 'mcpDebug']
        },
        enabled: {
            type: 'boolean',
            description: 'Whether to enable or disable the feature'
        }
    },
    required: ['feature', 'enabled']
} as const;

/**
 * Zod schema for runtime validation of parameters
 */
export const paramsSchema = z.object({
    feature: z.enum(['errorCapture', 'metricTracking', 'performanceMonitoring', 'mcpDebug'] as const),
    enabled: z.boolean()
});
