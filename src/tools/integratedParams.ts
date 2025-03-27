import { z } from "zod";
import { IntegratedConfig } from "../types/integrated.js";

export const TOOL_NAME = "integratedThinking";

/* PARAMETERS EXPLAINED

- content: The main content to be processed
- thoughtNumber: Current thought number in sequence
- totalThoughts: Estimated total thoughts needed
- draftNumber: Current draft number
- totalDrafts: Estimated total drafts needed
- needsRevision: True if current content needs revision
- nextStepNeeded: True if more steps are needed
- isRevision: True if this is a revision
- revisesDraft: If isRevision is true, which draft is being revised
- isCritique: True if this is a critique
- critiqueFocus: Focus area of the critique
- reasoningChain: Array of reasoning steps
- category: Categorization and metadata
- confidence: Confidence level
- context: Additional context
- mcpFeatures: Enabled MCP features
*/

// Enhanced tool parameters schema
export const TOOL_PARAMS = {
    content: z.string().describe("The main content to be processed"),
    thoughtNumber: z.number().min(1).describe("Current thought number in sequence"),
    totalThoughts: z.number().min(1).describe("Estimated total thoughts needed"),
    draftNumber: z.number().min(1).describe("Current draft number"),
    totalDrafts: z.number().min(1).describe("Estimated total drafts needed"),
    needsRevision: z.boolean().describe("True if current content needs revision"),
    nextStepNeeded: z.boolean().describe("True if more steps are needed"),
    isRevision: z.boolean().describe("True if this is a revision").optional(),
    revisesDraft: z.number().min(1).describe("If isRevision is true, which draft is being revised").optional(),
    isCritique: z.boolean().describe("True if this is a critique").optional(),
    critiqueFocus: z.string().describe("Focus area of the critique").optional(),
    reasoningChain: z.array(z.string()).describe("Array of reasoning steps").optional(),
    category: z.object({
        type: z.enum(['initial', 'critique', 'revision', 'final']),
        confidence: z.number().min(0).max(1),
        metadata: z.record(z.unknown()).optional()
    }).describe("Categorization and metadata").optional(),
    confidence: z.number().min(0).max(1).describe("Confidence level").optional(),
    context: z.object({
        problemScope: z.string().optional(),
        assumptions: z.array(z.string()).optional(),
        constraints: z.array(z.string()).optional()
    }).describe("Additional context").optional(),
    mcpFeatures: z.object({
        sequentialThinking: z.boolean().optional(),
        draftProcessing: z.boolean().optional(),
        parallelProcessing: z.boolean().optional(),
        monitoring: z.boolean().optional()
    }).describe("Enabled MCP features").optional()
};

// Enhanced tool description
export const TOOL_DESCRIPTION = `A powerful integrated tool combining Chain of Draft and Sequential Thinking capabilities.
This tool implements an advanced integrated processing system with the following capabilities:

Core Features:
- Combined draft and thought processing
- Integrated reasoning chains
- Cross-service optimization
- Adaptive processing
- Performance monitoring
- Error recovery

Enhancement Features:
- Automatic content summarization
- Multi-level categorization
- Progress tracking and metrics
- Dynamic strategy adaptation
- Confidence-based validation
- MCP integration

Processing Capabilities:
1. Integrated Initialization
   - Problem scope analysis
   - Required drafts and thoughts estimation
   - Parameter optimization
   - MCP feature configuration

2. Advanced Processing
   - Combined draft and thought generation
   - Critique analysis
   - Revision management
   - Context preservation
   - Parallel processing

3. Quality Assurance
   - Confidence thresholds
   - Revision tracking
   - Performance monitoring
   - Error detection
   - Cross-service validation

4. Debug Features
   - Error capture and analysis
   - Metric tracking
   - Performance optimization
   - State validation
   - MCP debugging

Usage Guidelines:
1. Start with clear problem definition
2. Configure MCP features as needed
3. Follow the integrated draft-thought cycle
4. Monitor confidence levels
5. Track progress and metrics
6. Leverage parallel processing
7. Use revision system for refinement

The tool maintains backward compatibility while providing enhanced integrated capabilities for complex processing scenarios.`; 