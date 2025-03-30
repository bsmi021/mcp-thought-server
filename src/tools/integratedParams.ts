import { z } from "zod";
import { contextSchema } from '../utils/index.js';

export const TOOL_NAME = "integratedThinking";

// Enhanced tool parameters schema with integrated category documentation
export const TOOL_PARAMS = {
  content: z.string().describe("REQUIRED: The main content to be processed"),
  thoughtNumber: z.number().min(1).describe("REQUIRED: Current thought number in sequence"),
  totalThoughts: z.number().min(1).describe("REQUIRED: Estimated total thoughts needed"),
  draftNumber: z.number().min(1).describe("REQUIRED: Current draft number"),
  totalDrafts: z.number().min(1).describe("REQUIRED: Estimated total drafts needed"),
  needsRevision: z.boolean().describe("REQUIRED: True if current content needs revision"),
  nextStepNeeded: z.boolean().describe("REQUIRED:True if more steps are needed in the process"),
  isRevision: z.boolean().describe("Set to true if this step represents a revised version of a previous draft. *(If true, 'revisesDraft' MUST be provided)*.").optional(),
  revisesDraft: z.number().min(1).describe("*(Required if isRevision is true)*. Specifies the draftNumber being revised. Must be less than the current draftNumber.").optional(),
  isCritique: z.boolean().describe("Set to true if this step involves providing a critique of a draft (content should be the critique text). *(If true, 'critiqueFocus' is strongly recommended)*.").optional(),
  critiqueFocus: z.string().describe("*(Optional, but strongly recommended if isCritique is true)*. Specifies the focus area of the critique (e.g., 'clarity', 'completeness', 'accuracy').").optional(),
  reasoningChain: z.array(z.string()).describe("Array of reasoning steps").optional(),
  category: z.object({
    type: z.enum(['initial', 'critique', 'revision', 'final']).describe(`
            ** Note the names of the categories are the only names that can be used.
            Integrated stage combining thought and draft processes:
            - 'initial': First analysis and draft (confidence: 0.5-0.7)
            - 'critique': Combined analysis and review (requires isCritique)
            - 'revision': Iterative improvement (requires isRevision)
            - 'final': Complete solution (confidence >= 0.9)

            **NOTE: Terms like 'analysis', 'justification', 'hypothesis', 'verification', 'review', etc. are descriptions of what happens in these stages,
            but are NOT valid stage names themselves. You MUST use one of the 4 stages listed above.**
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
  }).describe("Integrated categorization for both thinking and drafting processes"), // Removed .optional()
  // Deprecated top-level confidence removed. Use category.confidence.
  context: contextSchema.describe("REQUIRED: Additional context (problem scope, assumptions, constraints) relevant to the integrated process. Crucial for relevance scoring."), // Made required and improved description
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
*   \`category\`: (object) Categorization for the current stage (see details below). **This object is REQUIRED.** Valid types are: 'initial', 'critique', 'revision', 'final'. No other types are allowed.

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
*   **Deprecated Parameter:** The top-level optional \`confidence\` parameter has been removed. Use \`category.confidence\` instead.

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
5.  **Error Handling Example (Corrected):**
    \`\`\`json
    {
      "content": "Error detected in caching implementation",
      "thoughtNumber": 3,
      "totalThoughts": 6,  // Increased due to error
      "draftNumber": 2,
      "totalDrafts": 4,    // Increased for revision
      "needsRevision": true,
      "nextStepNeeded": true,
      "isCritique": true, // Added missing flag for critique type
      "category": {
        "type": "critique",
        "confidence": 0.4  // Low confidence triggered revision
      },
      "context": {
        "problemScope": "Error Resolution",
        "constraints": ["Must maintain existing API", "Zero downtime required"]
      }
    }
    \`\`\`


**Best Practices:**
*   Strictly adhere to the **REQUIRED Parameters** and **Conditional Requirements**.
*   Ensure \`category.type\` matches the action and associated flags (\`isRevision\`, \`isCritique\`).
*   Increment \`thoughtNumber\` and \`draftNumber\` appropriately based on the workflow stage.
*   Validate Category Types:  Valid types are: 'initial', 'critique', 'revision', 'final'
*   NOTE: The category type is the only name that can be used. Terms like 'analysis', 'hypothesis', 'evaluation', 'conclusion' are descriptions of stages but not valid category types.

**Error Handling:**
*   Incorrect parameter combinations (especially conditional ones) will cause errors.
*   Ensure \`category.confidence\` meets the threshold for the 'final' stage.
`;
