import { z } from 'zod';
import type { ThoughtContext, DraftContext } from '../types';

// Zod schema for context validation
export const contextSchema = z.object({
    problemScope: z.string().optional().default(''),
    assumptions: z.preprocess(
        (val) => Array.isArray(val) ? val.filter(item => typeof item === 'string' && item.length > 0) : [],
        z.array(z.string()).optional().default([])
    ),
    constraints: z.preprocess(
        (val) => Array.isArray(val) ? val.filter(item => typeof item === 'string' && item.length > 0) : [],
        z.array(z.string()).optional().default([])
    )
});

/**
 * Sanitizes and validates context input
 * @param context - Unknown input that should be converted to valid context
 * @returns Sanitized and validated context object
 */
export function sanitizeContext(context: unknown): ThoughtContext {
    // Handle null/undefined/non-object cases
    if (!context || typeof context !== 'object') {
        return {
            problemScope: '',
            assumptions: [],
            constraints: []
        };
    }

    try {
        // Attempt to parse and validate with Zod schema
        const validatedContext = contextSchema.parse(context);

        return {
            problemScope: validatedContext.problemScope,
            assumptions: validatedContext.assumptions,
            constraints: validatedContext.constraints
        };
    } catch (error) {
        // If validation fails, return safe defaults
        console.warn('Context validation failed:', error);
        return {
            problemScope: '',
            assumptions: [],
            constraints: []
        };
    }
}

/**
 * Calculates confidence score for context quality
 * @param context - Validated context object
 * @returns number between 0 and 1 indicating context quality
 */
export function getContextConfidence(context: ThoughtContext | DraftContext): number {
    const hasValidScope = typeof context.problemScope === 'string' && context.problemScope.length > 0;
    const hasValidAssumptions = Array.isArray(context.assumptions) && context.assumptions.length > 0;
    const hasValidConstraints = Array.isArray(context.constraints) && context.constraints.length > 0;

    // Weight each component
    return (
        (hasValidScope ? 0.4 : 0) +
        (hasValidAssumptions ? 0.3 : 0) +
        (hasValidConstraints ? 0.3 : 0)
    );
}

/**
 * Checks if a context object has any meaningful content
 * @param context - Validated context object
 * @returns boolean indicating if context has meaningful content
 */
export function hasContextContent(context: ThoughtContext | DraftContext): boolean {
    return (
        (typeof context.problemScope === 'string' && context.problemScope.length > 0) ||
        (Array.isArray(context.assumptions) && context.assumptions.length > 0) ||
        (Array.isArray(context.constraints) && context.constraints.length > 0)
    );
}

/**
 * Merges multiple contexts, removing duplicates
 * @param contexts - Array of context objects to merge
 * @returns Merged context object
 */
export function mergeContexts(contexts: (ThoughtContext | DraftContext)[]): ThoughtContext {
    const merged = contexts.reduce((acc, curr) => {
        return {
            problemScope: curr.problemScope || acc.problemScope,
            assumptions: [...(acc.assumptions || []), ...(curr.assumptions || [])],
            constraints: [...(acc.constraints || []), ...(curr.constraints || [])]
        };
    }, {
        problemScope: '',
        assumptions: [] as string[],
        constraints: [] as string[]
    });

    // Remove duplicates from arrays
    return {
        problemScope: merged.problemScope,
        assumptions: Array.from(new Set(merged.assumptions)),
        constraints: Array.from(new Set(merged.constraints))
    };
} 