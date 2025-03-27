import { z } from "zod";
import { DraftConfig, EnhancementConfig, DebugConfig } from "../types/chainOfDraft.js";

export const TOOL_NAME = "chainOfDraft";

/* PARAMETERS EXPLAINED

- content: The current content being worked on (draft/critique/revision)
- draftNumber: Current number in sequence (can go beyond initial total if needed)
- totalDrafts: Current estimate of drafts needed (can be adjusted up/down)
- needsRevision: True if the current draft needs revision
- isRevision: A boolean indicating if this is a revision of a previous draft
- revisesDraft: If isRevision is true, which draft number is being revised
- isCritique: A boolean indicating if this is a critique
- critiqueFocus: The focus area of the critique (e.g., 'completeness', 'clarity', etc.)
- reasoningChain: Array of reasoning steps leading to the current draft/critique
- nextStepNeeded: True if more steps are needed in the process
*/

// Enhanced tool parameters schema
export const TOOL_PARAMS = {
   content: z.string().describe("The current content being worked on (draft/critique/revision)"),
   draftNumber: z.number().min(1).describe("Current number in sequence"),
   totalDrafts: z.number().min(1).describe("Current estimate of drafts needed"),
   needsRevision: z.boolean().describe("True if the current draft needs revision"),
   nextStepNeeded: z.boolean().describe("True if more steps are needed in the process"),
   isRevision: z.boolean().describe("A boolean indicating if this is a revision of a previous draft").optional(),
   revisesDraft: z.number().min(1).describe("If isRevision is true, which draft number is being revised").optional(),
   isCritique: z.boolean().describe("A boolean indicating if this is a critique").optional(),
   critiqueFocus: z.string().describe("The focus area of the critique").optional(),
   reasoningChain: z.array(z.string()).describe("Array of reasoning steps leading to the current draft/critique").optional(),
   category: z.object({
      type: z.enum(['initial', 'critique', 'revision', 'final']),
      confidence: z.number().min(0).max(1),
      metadata: z.record(z.unknown()).optional()
   }).describe("Categorization and metadata for the draft").optional(),
   confidence: z.number().min(0).max(1).describe("Confidence level for this draft").optional(),
   context: z.object({
      problemScope: z.string().optional(),
      assumptions: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional()
   }).describe("Additional context for the draft").optional()
};

// Enhanced tool description
export const TOOL_DESCRIPTION = `A powerful tool for implementing the Chain of Draft (CoD) prompting technique.
This tool implements an advanced drafting process with the following capabilities:

Core Features:
- Iterative draft refinement
- Structured critique generation
- Intelligent revision handling
- Quality validation
- Progress tracking
- Performance monitoring

Enhancement Features:
- Automatic draft summarization
- Draft categorization and metadata
- Progress tracking and metrics
- Dynamic strategy adaptation
- Confidence-based validation

Processing Capabilities:
1. Draft Initialization
   - Problem scope analysis
   - Required drafts estimation
   - Parameter optimization

2. Advanced Processing
   - Draft generation
   - Critique analysis
   - Revision management
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
2. Follow the draft-critique-revision cycle
3. Monitor confidence levels
4. Track progress and metrics
5. Leverage parallel processing when possible
6. Use revision system for refinement

The tool maintains backward compatibility while providing enhanced capabilities for complex drafting scenarios.`; 