import { z } from "zod";
import { contextSchema } from '../utils/index.js';

export const TOOL_NAME = "chainOfDraft";

// Zod schema defining the input parameters for the chainOfDraft tool.
// Descriptions are crucial for LLM understanding and correct usage.
export const TOOL_PARAMS = {
   content: z.string().describe("(Required) The current content being worked on (initial draft, critique text, or revised draft)."),
   draftNumber: z.number().min(1).describe("(Required) Current draft iteration number (starts at 1). Increments only for revisions, not critiques."),
   totalDrafts: z.number().min(1).describe("(Required) Estimated total draft iterations needed for the task (can be adjusted)."),
   needsRevision: z.boolean().describe("(Required) Boolean flag indicating if the current draft needs revision based on critique or self-assessment."),
   nextStepNeeded: z.boolean().describe("(Required) Boolean flag indicating if further steps (critique or revision) are required to complete the drafting process."),
   isRevision: z.boolean().describe("Set to true if this step represents a revised version of a previous draft.").optional(),
   revisesDraft: z.number().min(1).describe("*(Required if isRevision is true)*. Specifies the draftNumber being revised. Must be less than the current draftNumber.").optional(),
   isCritique: z.boolean().describe("Set to true if this step involves providing a critique of a draft (content should be the critique text).").optional(),
   critiqueFocus: z.string().describe("*(Optional, but recommended if isCritique is true)*. Specifies the focus area of the critique (e.g., 'clarity', 'completeness', 'accuracy').").optional(),
   reasoningChain: z.array(z.string()).describe("Array of strings outlining the reasoning steps, critique points, or revision justifications.").optional(),
   category: z.object({
      type: z.enum(['initial', 'critique', 'revision', 'final']).describe(`(Required) The current stage type. Must be one of: 'initial', 'critique', 'revision', 'final'. See TOOL_DESCRIPTION for details on each stage and its requirements (e.g., 'critique' requires isCritique=true, 'revision' requires isRevision=true).`),
      confidence: z.number().min(0).max(1).describe(`(Required) Confidence score (0-1) reflecting the quality/certainty of the current draft or critique. See TOOL_DESCRIPTION for score interpretation guidelines.`),
      metadata: z.record(z.unknown()).optional().describe("Optional object for additional stage-specific metadata (e.g., critique aspects, revision source).")
   }).describe("(Required) Categorization for the current drafting stage."),
   // Note: Top-level 'confidence' parameter removed as it was unused/confusing. Confidence is handled within the 'category' object.
   context: contextSchema.describe("Additional context (original prompt, goals, constraints) relevant to the drafting process.").optional()
};

// Tool description providing comprehensive usage guidance for LLMs.
export const TOOL_DESCRIPTION = `A powerful tool for implementing the Chain of Draft (CoD) technique for iterative content generation and refinement.

**Core Functionality:**
Facilitates a structured process of drafting, critiquing, and revising content until a desired quality level is reached. Manages state across iterations using draft numbers and categories.

**REQUIRED Parameters (MUST be provided in EVERY call):**
*   \`content\`: (string) The current content (initial draft, critique text, or revised draft).
*   \`draftNumber\`: (number) Current draft iteration number (starts at 1).
*   \`totalDrafts\`: (number) Estimated total draft iterations needed.
*   \`needsRevision\`: (boolean) Does the current draft need revision?
*   \`nextStepNeeded\`: (boolean) Are more steps required?
*   \`category\`: (object) Categorization for the current stage (see details below).

**Key Parameter Rules & Relationships:**
*   **Category Object (Required):** This object MUST be provided.
    *   \`type\`: (enum) REQUIRED. Must be one of: 'initial', 'critique', 'revision', 'final'.
    *   \`confidence\`: (number 0-1) REQUIRED. Reflects quality/certainty. See interpretation below.
    *   \`metadata\`: (object) Optional. Additional stage-specific info.
*   **Conditional Requirements (CRITICAL):**
    *   If \`isRevision\` flag is set to \`true\`, then \`revisesDraft\` (number) **MUST** also be provided and be less than the current \`draftNumber\`.
    *   If \`category.type\` is set to 'revision', then \`isRevision\` (boolean) **MUST** be set to \`true\`.
    *   If \`category.type\` is set to 'critique', then \`isCritique\` (boolean) **MUST** be set to \`true\`. The \`content\` field should contain the critique text. Providing \`critiqueFocus\` (string) is strongly recommended.
    *   If \`category.type\` is set to 'final', then \`needsRevision\` **MUST** be \`false\` and \`nextStepNeeded\` **MUST** be \`false\`.
*   **Confidence Interpretation (\`category.confidence\`):**
    *   < 0.4: Critical issues
    *   0.4-0.6: Basic quality
    *   0.6-0.8: Good quality
    *   0.8-0.9: High quality
    *   >= 0.9: Excellent (required for 'final' stage)
*   **Deprecated Parameter:** The top-level optional \`confidence\` parameter is unused and **SHOULD NOT** be provided. Use \`category.confidence\` instead.

**Suggested Workflow & Examples:**
1.  **Initial:** Start with \`category.type='initial'\`, \`draftNumber=1\`. Provide the first draft in \`content\`.
    \`\`\`json
    {
      "content": "This is the first draft of the document.",
      "draftNumber": 1, // Start at 1
      "totalDrafts": 3,
      "needsRevision": true, // Assume critique is needed
      "nextStepNeeded": true,
      "category": { "type": "initial", "confidence": 0.6 } // Category REQUIRED
    }
    \`\`\`
2.  **Critique:** Set \`category.type='critique'\`, \`isCritique=true\`. Provide critique text in \`content\`. \`draftNumber\` remains the same as the draft being critiqued.
    \`\`\`json
    {
      "content": "Critique: The introduction is unclear and lacks a strong thesis statement.",
      "draftNumber": 1, // Refers to the draft being critiqued
      "totalDrafts": 3,
      "needsRevision": true, // Critique indicates revision is needed
      "nextStepNeeded": true,
      "isCritique": true, // MUST be true for category 'critique'
      "critiqueFocus": "Introduction clarity", // Recommended
      "category": { "type": "critique", "confidence": 0.7 } // Category REQUIRED
    }
    \`\`\`
3.  **Revision:** Set \`category.type='revision'\`, \`isRevision: true\`, provide \`revisesDraft\`. Provide revised draft in \`content\`. Increment \`draftNumber\`.
    \`\`\`json
    {
      "content": "Revised draft with a clearer introduction and thesis.",
      "draftNumber": 2,   // Increment draft number for revision
      "totalDrafts": 3,
      "needsRevision": false, // Assuming revision addresses critique sufficiently
      "nextStepNeeded": true, // Assuming a final review/critique might follow
      "isRevision": true, // MUST be true for category 'revision'
      "revisesDraft": 1,  // MUST provide draft being revised
      "category": { "type": "revision", "confidence": 0.85 } // Category REQUIRED
    }
    \`\`\`
4.  **Repeat Critique/Revision:** Iterate steps 2 and 3 as needed, incrementing \`draftNumber\` for each revision.
5.  **Final:** Set \`category.type='final'\`, ensure high confidence, \`needsRevision=false\`, \`nextStepNeeded=false\`. Provide the final draft in \`content\`.
    \`\`\`json
    {
      "content": "Final version of the document incorporating all feedback.",
      "draftNumber": 3,   // Final draft number
      "totalDrafts": 3,
      "needsRevision": false, // MUST be false for 'final'
      "nextStepNeeded": false, // MUST be false for 'final'
      "category": { "type": "final", "confidence": 0.95 } // Category REQUIRED, high confidence
    }
    \`\`\`

**Best Practices:**
*   Maintain accurate \`draftNumber\` sequence for revisions.
*   Ensure \`category.type\` matches the action (critique vs. revision).
*   Provide clear \`content\` for each stage (draft or critique text).
*   Use \`context\` and \`reasoningChain\` to maintain clarity.

**Error Handling:**
*   Invalid parameter combinations (e.g., \`isRevision=true\` without \`revisesDraft\`) will cause errors.
*   Ensure \`category.type\` and associated flags (\`isRevision\`, \`isCritique\`) are consistent.
*   Monitor confidence scores to guide the process towards the 'final' stage.

This tool enables systematic improvement of generated content through structured critique and revision cycles.`;

// Note: Removed large comment blocks with parameter relationships, examples, etc.
// This information has been integrated into the TOOL_DESCRIPTION and Zod parameter descriptions above for better LLM accessibility.
