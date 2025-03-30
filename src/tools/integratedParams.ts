import { z } from "zod";
import { contextSchema } from '../utils/index.js';

export const TOOL_NAME = "integratedThinking";

/* PARAMETERS EXPLAINED

Required Parameters:
------------------
content: The main content to be processed
- Must contain the primary text/data for processing
- No size limit but affects performance
- Used in confidence calculations
- Core input for both sequential and draft processing

thoughtNumber: Current thought number in sequence
- Must start at 1 and increment sequentially
- Used for tracking progress
- Critical for revision chains
- Affects confidence inheritance

totalThoughts: Estimated total thoughts needed
- Initial estimate that can be adjusted
- Minimum value: 1
- Used for resource allocation
- Affects parallel processing decisions

draftNumber: Current draft number
- Must start at 1 and increment
- Tracks progress in draft chain
- Used in revision management
- Critical for draft relationships

totalDrafts: Estimated total drafts needed
- Initial estimate that can be adjusted
- Minimum value: 1
- Used for resource planning
- Affects quality thresholds

needsRevision: Boolean flag for revision state
- true = Current content needs revision
- false = Content meets quality threshold
- Affects next step decisions
- Triggers revision processes

nextStepNeeded: Control flow indicator
- true = More processing steps required
- false = Current phase complete
- Controls workflow progression
- Affects resource allocation

PARAMETER RELATIONSHIPS

1. Draft-Thought Relationship:
   - thoughtNumber tracks sequential thinking progress
   - draftNumber tracks draft refinement progress
   - Both must increment properly within their chains
   - Can't have draft without associated thought

2. Revision Chain:
   - needsRevision triggers revision processes
   - isRevision indicates revision state
   - revisesDraft must reference valid draft
   - Affects confidence calculations

3. Category-Confidence Flow:
   - category.type affects processing path
   - category.confidence influences decisions
   - Overall confidence calculated from multiple factors
   - Thresholds vary by category type

4. Context Inheritance:
   - Context flows through thought chain
   - Draft inherits context from thoughts
   - Revisions maintain context lineage
   - Critical for coherence

ERROR HANDLING AND PERFORMANCE

1. Validation Errors:
   - Invalid parameter combinations
   - Out-of-sequence numbers
   - Missing required relationships
   - Resolution strategies

2. Performance Considerations:
   - Content size impacts
   - Resource allocation
   - Parallel processing limits
   - Memory management

3. Quality Control:
   - Confidence thresholds
   - Revision triggers
   - Context validation
   - Output verification

VALIDATION RULES

1. Required Parameters:
   - content, thoughtNumber, totalThoughts, draftNumber, totalDrafts,
     needsRevision, and nextStepNeeded must always be present
   - thoughtNumber and draftNumber must be >= 1
   - totalThoughts and totalDrafts must be >= thoughtNumber and draftNumber respectively

2. Revision Rules:
   - If isRevision is true, revisesDraft must be present and < current draftNumber
   - If needsRevision is true, nextStepNeeded should be true
   - category.confidence affects revision triggers

3. Category Rules:
   - type must be one of: 'initial', 'critique', 'revision', 'final'
   - confidence must be between 0 and 1
   - 'final' type requires high confidence (>= 0.9)

4. Feature Rules:
   - mcpFeatures can enable/disable specific processing capabilities
   - parallelProcessing requires monitoring to be true
   - sequentialThinking and draftProcessing can't both be false

USAGE EXAMPLES

1. Basic Processing:
{
  content: "Analyzing performance bottlenecks in the system",
  thoughtNumber: 1,
  totalThoughts: 5,
  draftNumber: 1,
  totalDrafts: 3,
  needsRevision: false,
  nextStepNeeded: true,
  category: {
    type: 'initial',
    confidence: 0.8
  },
  mcpFeatures: {
    sequentialThinking: true,
    draftProcessing: true,
    monitoring: true
  }
}

2. Revision Example:
{
  content: "Revised approach: Implement caching layer before database queries",
  thoughtNumber: 2,
  totalThoughts: 5,
  draftNumber: 2,
  totalDrafts: 3,
  needsRevision: false,
  nextStepNeeded: true,
  isRevision: true,
  revisesDraft: 1,
  category: {
    type: 'revision',
    confidence: 0.9
  },
  context: {
    problemScope: "Performance Optimization",
    assumptions: ["High read/write ratio", "Available memory sufficient"]
  }
}

3. Final Integration Example:
{
  content: "Implementing final solution with all optimizations",
  thoughtNumber: 5,
  totalThoughts: 5,
  draftNumber: 3,
  totalDrafts: 3,
  needsRevision: false,
  nextStepNeeded: false,
  category: {
    type: 'final',
    confidence: 0.95
  },
  mcpFeatures: {
    sequentialThinking: true,
    draftProcessing: true,
    parallelProcessing: true,
    monitoring: true
  }
}

4. Error Handling Example:
{
  content: "Error detected in caching implementation",
  thoughtNumber: 3,
  totalThoughts: 6,  // Increased due to error
  draftNumber: 2,
  totalDrafts: 4,    // Increased for revision
  needsRevision: true,
  nextStepNeeded: true,
  category: {
    type: 'critique',
    confidence: 0.4  // Low confidence triggered revision
  },
  context: {
    problemScope: "Error Resolution",
    constraints: ["Must maintain existing API", "Zero downtime required"]
  }
}

Category System:
--------------
The integrated thinking tool uses the same category types as chainOfDraft but with enhanced context
awareness and integration with sequential thinking:

1. 'initial' - First stage combining draft and thought
   - Used for initial problem analysis and first draft
   - Combines sequential analysis with draft creation
   - Typically starts with moderate confidence (0.5-0.7)
   Example:
   {
     content: "Initial analysis of performance bottlenecks",
     thoughtNumber: 1,
     totalThoughts: 5,
     draftNumber: 1,
     totalDrafts: 3,
     category: {
       type: 'initial',
       confidence: 0.6,
       metadata: {
         phase: 'problem_analysis',
         thinking_stage: 'exploration'
       }
     }
   }

2. 'critique' - Combined analysis and review
   - Integrates sequential thinking analysis with draft critique
   - Requires both thought analysis and draft review
   - Should specify critiqueFocus for clarity
   Example:
   {
     content: "Critical analysis of proposed solution",
     thoughtNumber: 2,
     totalThoughts: 5,
     draftNumber: 1,
     totalDrafts: 3,
     category: {
       type: 'critique',
       confidence: 0.85,
       metadata: {
         analysis_focus: 'feasibility',
         critique_aspects: ['performance', 'scalability']
       }
     },
     isCritique: true,
     critiqueFocus: 'solution_viability'
   }

3. 'revision' - Iterative improvement
   - Combines sequential thought revision with draft updates
   - Must reference both previous thought and draft
   - Higher confidence threshold than initial (0.7-0.9)
   Example:
   {
     content: "Revised approach based on performance analysis",
     thoughtNumber: 3,
     totalThoughts: 5,
     draftNumber: 2,
     totalDrafts: 3,
     category: {
       type: 'revision',
       confidence: 0.8,
       metadata: {
         revision_basis: 'performance_analysis',
         thought_chain: ['analysis', 'critique', 'revision']
       }
     },
     isRevision: true,
     revisesDraft: 1
   }

4. 'final' - Complete solution
   - Represents both final thought and polished draft
   - Requires highest confidence level (>= 0.9)
   - Must show thought progression and draft evolution
   Example:
   {
     content: "Final optimized solution with implementation details",
     thoughtNumber: 5,
     totalThoughts: 5,
     draftNumber: 3,
     totalDrafts: 3,
     category: {
       type: 'final',
       confidence: 0.95,
       metadata: {
         thought_completion: true,
         draft_validated: true,
         final_checks: ['completeness', 'correctness', 'optimization']
       }
     },
     needsRevision: false,
     nextStepNeeded: false
   }

Confidence Scoring in Integrated Context:
--------------------------------------
Confidence scores consider both thinking and drafting aspects:

1. Thinking Component (50% weight):
   - Problem understanding: 0-0.3
   - Analysis depth: 0-0.3
   - Solution viability: 0-0.4

2. Drafting Component (50% weight):
   - Content quality: 0-0.3
   - Completeness: 0-0.3
   - Refinement: 0-0.4

Combined Score Interpretation:
- < 0.4: Critical issues in either thinking or drafting
- 0.4-0.6: Basic progress, needs significant improvement
- 0.6-0.8: Good progress, minor refinements needed
- 0.8-0.9: High quality, final review stage
- >= 0.9: Excellent, ready for completion

Category Relationships and Transitions:
-----------------------------------
1. Initial -> Critique:
   - Requires complete thought analysis
   - Draft must be substantial enough for review
   - Context preservation across both aspects

2. Critique -> Revision:
   - Thought analysis must support critique findings
   - Draft revisions must address identified issues
   - Maintains dual context awareness

3. Revision -> Final:
   - Both thought chain and draft must be complete
   - All critiques must be addressed
   - High confidence required in both aspects

Integration with MCP Features:
---------------------------
The category system integrates with MCP features through:
1. Sequential thinking enabled: Affects thought progression
2. Draft processing active: Influences draft refinement
3. Parallel processing: Allows concurrent thought/draft work
4. Monitoring: Tracks both thought and draft metrics
*/

// Enhanced tool parameters schema with integrated category documentation
export const TOOL_PARAMS = {
  content: z.string().describe("The main content to be processed"),
  thoughtNumber: z.number().min(1).describe("Current thought number in sequence"),
  totalThoughts: z.number().min(1).describe("Estimated total thoughts needed"),
  draftNumber: z.number().min(1).describe("Current draft number"),
  totalDrafts: z.number().min(1).describe("Estimated total drafts needed"),
  needsRevision: z.boolean().describe("True if current content needs revision"),
  nextStepNeeded: z.boolean().describe("True if more steps are needed in the process"),
  isRevision: z.boolean().describe("True if this is a revision").optional(),
  revisesDraft: z.number().min(1).describe("If isRevision is true, which draft is being revised").optional(),
  isCritique: z.boolean().describe("True if this is a critique").optional(),
  critiqueFocus: z.string().describe("Focus area of the critique").optional(),
  reasoningChain: z.array(z.string()).describe("Array of reasoning steps").optional(),
  category: z.object({
    type: z.enum(['initial', 'critique', 'revision', 'final']).describe(`
            ** Note the names of the categories are the only names that can be used.
            Integrated stage combining thought and draft processes:
            - 'initial': First analysis and draft (confidence: 0.5-0.7)
            - 'critique': Combined analysis and review (requires isCritique)
            - 'revision': Iterative improvement (requires isRevision)
            - 'final': Complete solution (confidence >= 0.9)

             NOTE: Terms like 'analysis', 'review', etc. are descriptions of what happens in these stages,
            but are NOT valid stage names themselves. You MUST use one of the 4 stages listed above.
        `),
    confidence: z.number().min(0).max(1).describe(`
            ** Note the confidence score is a combined score of the thinking and drafting processes.
            Combined confidence score (thinking + drafting):
            < 0.4: Critical issues
            0.4-0.6: Basic progress
            0.6-0.8: Good progress
            0.8-0.9: High quality
            >= 0.9: Excellent
        `),
    metadata: z.record(z.unknown()).describe("Additional stage-specific information for both thought and draft aspects").optional()
  }).describe("Integrated categorization for both thinking and drafting processes").optional(),
  confidence: z.number().min(0).max(1).describe("Overall confidence level").optional(), // Keeping original TOOL_PARAMS definition
  context: contextSchema.describe("Additional context for integrated processing").optional(),
  mcpFeatures: z.object({
    sequentialThinking: z.boolean().optional(),
    draftProcessing: z.boolean().optional(),
    parallelProcessing: z.boolean().optional(),
    monitoring: z.boolean().optional()
  }).describe("Enabled MCP features affecting category processing").optional()
};

// Refined TOOL_DESCRIPTION (Simulated High Confidence Output)
export const TOOL_DESCRIPTION = `A powerful integrated tool combining Chain of Draft and Sequential Thinking capabilities for complex problem-solving and content generation.

**Core Functionality:**
Processes content through iterative cycles of thinking (analysis, hypothesis, verification) and drafting (initial, critique, revision, final). Manages state across steps using thought/draft numbers and categories.

**REQUIRED Parameters (MUST be provided in EVERY call):**
*   \`content\`: (string) The main content (text, data, code) for this step.
*   \`thoughtNumber\`: (number) Current sequential thinking step number (starts at 1).
*   \`totalThoughts\`: (number) Estimated total sequential thinking steps needed (can be adjusted).
*   \`draftNumber\`: (number) Current draft iteration number (starts at 1).
*   \`totalDrafts\`: (number) Estimated total draft iterations needed (can be adjusted).
*   \`needsRevision\`: (boolean) Flag indicating if the current content requires revision?
*   \`nextStepNeeded\`: (boolean) Are more processing steps required after this one?
*   \`category\`: (object) Categorization for the current stage (see details below).

**Key Parameter Rules & Relationships:**
*   **Category Object (Required):** This object MUST be provided.
    *   \`type\`: (enum) REQUIRED. Must be one of: 'initial', 'critique', 'revision', 'final'.
    *   \`confidence\`: (number 0-1) REQUIRED. Combined score reflecting quality/certainty. See interpretation below.
    *   \`metadata\`: (object) Optional. Additional stage-specific info.
*   **Conditional Requirements (CRITICAL):**
    *   If \`isRevision\` flag is set to \`true\`, then \`revisesDraft\` (number) **MUST** also be provided and its value must be less than the current \`draftNumber\`.
    *   If \`category.type\` is set to 'revision', then the \`isRevision\` flag (boolean) **MUST** be set to \`true\`.
    *   If \`category.type\` is set to 'critique', then the \`isCritique\` flag (boolean) **MUST** be set to \`true\`. Providing \`critiqueFocus\` (string) is strongly recommended.
    *   If \`category.type\` is set to 'final', then \`needsRevision\` **MUST** be \`false\` and \`nextStepNeeded\` **MUST** be \`false\`.
*   **Confidence Interpretation (\`category.confidence\`):**
    *   < 0.4: Critical issues.
    *   0.4-0.6: Basic progress.
    *   0.6-0.8: Good progress.
    *   0.8-0.9: High quality.
    *   >= 0.9: Excellent (Required for 'final' stage).
*   **Deprecated Parameter:** The top-level optional \`confidence\` parameter is unused and **SHOULD NOT** be provided. Use \`category.confidence\` instead.

**Suggested Workflow & Examples:**
1.  **Initial:** Start with \`category.type='initial'\`, \`thoughtNumber=1\`, \`draftNumber=1\`.
    \`\`\`json
    {
      "content": "Initial analysis of system performance",
      "thoughtNumber": 1, // Start at 1
      "totalThoughts": 4,
      "draftNumber": 1,   // Start at 1
      "totalDrafts": 3,
      "needsRevision": false,
      "nextStepNeeded": true,
      "category": { "type": "initial", "confidence": 0.6 } // Category REQUIRED
    }
    \`\`\`
2.  **Critique:** Set \`category.type='critique'\` and \`isCritique: true\`. Increment \`thoughtNumber\`.
    \`\`\`json
    {
      "content": "Critique: Identified bottlenecks in database queries",
      "thoughtNumber": 2, // Increment thought
      "totalThoughts": 4,
      "draftNumber": 1,   // Draft number unchanged for critique
      "totalDrafts": 3,
      "needsRevision": true, // Critique found issues
      "nextStepNeeded": true,
      "isCritique": true, // MUST be true for category 'critique'
      "critiqueFocus": "performance_bottlenecks", // Recommended
      "category": { "type": "critique", "confidence": 0.7 } // Category REQUIRED
    }
    \`\`\`
3.  **Revision:** Set \`category.type='revision'\`, \`isRevision: true\`, provide \`revisesDraft\`. Increment \`thoughtNumber\` and \`draftNumber\`.
    \`\`\`json
    {
      "content": "Revision: Implementing caching layer...",
      "thoughtNumber": 3, // Increment thought
      "totalThoughts": 4,
      "draftNumber": 2,   // Increment draft for revision
      "totalDrafts": 3,
      "needsRevision": false, // Assuming revision is sufficient
      "nextStepNeeded": true,
      "isRevision": true, // MUST be true for category 'revision'
      "revisesDraft": 1,  // MUST provide draft being revised (must be < draftNumber)
      "category": { "type": "revision", "confidence": 0.85 } // Category REQUIRED
    }
    \`\`\`
4.  **Final:** Set \`category.type='final'\`, ensure high confidence, \`needsRevision: false\`, \`nextStepNeeded: false\`.
    \`\`\`json
    {
      "content": "Final: Complete optimization solution...",
      "thoughtNumber": 4, // Final thought
      "totalThoughts": 4,
      "draftNumber": 3,   // Final draft
      "totalDrafts": 3,
      "needsRevision": false, // MUST be false for 'final'
      "nextStepNeeded": false, // MUST be false for 'final'
      "category": { "type": "final", "confidence": 0.95 } // Category REQUIRED, high confidence
    }
    \`\`\`

**Best Practices:**
*   Strictly adhere to the **REQUIRED Parameters** and **Conditional Requirements**.
*   Ensure \`category.type\` matches the action and associated flags (\`isRevision\`, \`isCritique\`).
*   Increment \`thoughtNumber\` and \`draftNumber\` appropriately based on the workflow stage.

**Error Handling:**
*   Incorrect parameter combinations (especially conditional ones) will cause errors.
*   Ensure \`category.confidence\` meets the threshold for the 'final' stage.
`;

// Note: Removed final comment block about Parameter Relationships as info is integrated above.
