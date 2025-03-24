import { z } from "zod";
import { CoreConfig, EnhancementConfig, DebugConfig } from "../types/index.js";


export const TOOL_NAME = "sequentialThinking";

/* PARAMETERS EXPLAINED

- thought: Your current thinking step, which can include:
* Regular analytical steps
* Revisions of previous thoughts
* Questions about previous decisions
* Realizations about needing more analysis
* Changes in approach
* Hypothesis generation
* Hypothesis verification
- nextThoughtNeeded: True if you need more thinking, even if at what seemed like the end
- thoughtNumber: Current number in sequence (can go beyond initial total if needed)
- totalThoughts: Current estimate of thoughts needed (can be adjusted up/down)
- isRevision: A boolean indicating if this thought revises previous thinking
- revisesThought: If isRevision is true, which thought number is being reconsidered
- branchFromThought: If branching, which thought number is the branching point
- branchId: Identifier for the current branch (if any)
- needsMoreThoughts: If reaching end but realizing more thoughts needed
*/

// Enhanced tool parameters schema
export const TOOL_PARAMS = {
    thought: z.string().describe("Your current thinking step, which can include: * Regular analytical steps * Revisions of previous thoughts * Questions about previous decisions * Realizations about needing more analysis * Changes in approach * Hypothesis generation * Hypothesis verification"),
    nextThoughtNeeded: z.boolean().describe("True if you need more thinking, even if at what seemed like the end"),
    thoughtNumber: z.number().min(1).describe("Current number in sequence (can go beyond initial total if needed)"),
    totalThoughts: z.number().min(1).describe("Current estimate of thoughts needed (can be adjusted up/down)"),
    isRevision: z.boolean().describe("A boolean indicating if this thought revises previous thinking").optional(),
    revisesThought: z.number().min(1).describe("If isRevision is true, which thought number is being reconsidered").optional(),
    branchFromThought: z.number().min(1).describe("If branching, which thought number is the branching point").optional(),
    branchId: z.string().describe("Identifier for the current branch (if any)").optional(),
    needsMoreThoughts: z.boolean().describe("If reaching end but realizing more thoughts needed").optional(),
    category: z.object({
        type: z.enum(['analysis', 'hypothesis', 'verification', 'revision', 'solution']),
        confidence: z.number().min(0).max(1),
        metadata: z.record(z.unknown()).optional()
    }).describe("Categorization and metadata for the thought").optional(),
    confidence: z.number().min(0).max(1).describe("Confidence level for this thought").optional(),
    context: z.object({
        problemScope: z.string().optional(),
        assumptions: z.array(z.string()).optional(),
        constraints: z.array(z.string()).optional()
    }).describe("Additional context for the thought").optional()
};

// Enhanced tool description
export const TOOL_DESCRIPTION = `A powerful tool for dynamic and reflective problem-solving through structured thinking.
This tool implements an advanced sequential thinking process with the following capabilities:

Core Features:
- Maximum depth of 12 sequential thoughts
- Parallel processing of compatible thoughts
- Large context window (163840 tokens)
- Advanced branching capabilities
- Revision system with confidence thresholds
- Dynamic adaptation based on context

Enhancement Features:
- Automatic thought summarization
- Thought categorization and metadata
- Progress tracking and metrics
- Dynamic strategy adaptation
- Confidence-based validation

Processing Capabilities:
1. Thought Initialization
   - Problem scope analysis
   - Required thoughts estimation
   - Parameter optimization

2. Advanced Processing
   - Parallel thought execution
   - Branch management
   - Dynamic adaptation
   - Context preservation

3. Quality Assurance
   - Confidence thresholds
   - Revision tracking
   - Performance monitoring
   - Error detection

4. Debug Features
   - Error capture and analysis
   - Metric tracking
   - Performance optimization
   - State validation

Usage Guidelines:
1. Start with clear problem definition
2. Utilize branching for complex scenarios
3. Monitor confidence levels
4. Track progress and metrics
5. Leverage parallel processing
6. Use revision system for refinement

The tool maintains backward compatibility while providing enhanced capabilities for complex problem-solving scenarios.`;