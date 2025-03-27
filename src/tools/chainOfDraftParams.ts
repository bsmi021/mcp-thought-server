import { z } from "zod";
import { contextSchema } from '../utils/index.js';

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

Category Types and Usage:
-----------------------
The category parameter defines the current stage of the drafting process:

1. 'initial' - First draft or starting point
   - Used when creating the first version
   - Typically has lower confidence (0.4-0.7)
   - No revision history required
   Example:
   {
     category: {
       type: 'initial',
       confidence: 0.6,
       metadata: { stage: 'first_draft' }
     }
   }

2. 'critique' - Review and analysis phase
   - Used when evaluating existing content
   - Requires isCritique: true
   - Should specify critiqueFocus
   - Confidence reflects critique thoroughness
   Example:
   {
     category: {
       type: 'critique',
       confidence: 0.85,
       metadata: { focus: 'completeness' }
     },
     isCritique: true,
     critiqueFocus: 'completeness'
   }

3. 'revision' - Modified version based on critique
   - Requires isRevision: true and revisesDraft
   - Higher confidence than initial (0.6-0.9)
   - Must reference previous draft
   Example:
   {
     category: {
       type: 'revision',
       confidence: 0.75,
       metadata: { based_on_critique: true }
     },
     isRevision: true,
     revisesDraft: 1
   }

4. 'final' - Completed and validated version
   - Requires high confidence (>= 0.9)
   - Should have revision history
   - No further revision needed
   Example:
   {
     category: {
       type: 'final',
       confidence: 0.95,
       metadata: { validated: true }
     },
     needsRevision: false
   }

Confidence Score Impact:
----------------------
- < 0.4: Critical issues, requires immediate revision
- 0.4-0.6: Basic draft quality, needs improvement
- 0.6-0.8: Good quality, minor revisions may be needed
- 0.8-0.9: High quality, ready for final review
- >= 0.9: Excellent quality, can be marked as final

Category Relationships:
---------------------
1. Initial -> Critique:
   - First draft must be critiqued before revision
   - Critique inherits context from initial

2. Critique -> Revision:
   - Critique leads to revision if needsRevision: true
   - Revision must reference original draft

3. Revision -> Final:
   - Multiple revisions may be needed
   - Final requires high confidence
   - Must have revision history
*/

// Enhanced tool parameters schema with detailed category documentation
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
      type: z.enum(['initial', 'critique', 'revision', 'final']).describe(`
         The stage of the drafting process:
         - 'initial': First draft (confidence: 0.4-0.7)
         - 'critique': Review phase (requires isCritique: true)
         - 'revision': Modified version (requires isRevision: true)
         - 'final': Completed version (confidence >= 0.9)
      `),
      confidence: z.number().min(0).max(1).describe(`
         Confidence score affecting processing:
         < 0.4: Critical issues
         0.4-0.6: Basic quality
         0.6-0.8: Good quality
         0.8-0.9: High quality
         >= 0.9: Excellent
      `),
      metadata: z.record(z.unknown()).optional().describe("Additional stage-specific information")
   }).describe("Categorization and metadata for the draft stage").optional(),
   confidence: z.number().min(0).max(1).describe("Confidence level for this draft").optional(),
   context: contextSchema.describe("Additional context for the draft").optional()
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