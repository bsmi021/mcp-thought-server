import { z } from "zod";
import { contextSchema } from '../utils/index.js';

export const TOOL_NAME = "sequentialThinking";

// Zod schema defining the input parameters for the sequentialThinking tool.
// Descriptions are crucial for LLM understanding and correct usage.
export const TOOL_PARAMS = {
  thought: z.string().describe("(Required) The content of the current thinking step (e.g., analysis, hypothesis, revision)."),
  nextThoughtNeeded: z.boolean().describe("(Required) Boolean flag indicating if further thinking steps are required in the current sequence/branch."),
  thoughtNumber: z.number().min(1).describe("(Required) The sequential number of this thought within its branch (starts at 1)."),
  totalThoughts: z.number().min(1).describe("(Required) The current estimated total number of thoughts needed for this sequence/branch (can be adjusted)."),
  isRevision: z.boolean().describe("Set to true if this thought revises a previous thought.").optional(),
  revisesThought: z.number().min(1).describe("*(Required if isRevision is true)*. Specifies the thoughtNumber being revised within the same branch. Must be less than the current thoughtNumber.").optional(),
  branchFromThought: z.number().min(1).describe("If starting a new branch of thinking, specifies the thoughtNumber from the parent branch to branch from.").optional(),
  branchId: z.string().describe("*(Required if branchFromThought is provided)*. A unique string identifier for the new branch being created (e.g., 'performance-analysis', 'security-review').").optional(),
  needsMoreThoughts: z.boolean().describe("Set to true if the current analysis indicates that the 'totalThoughts' estimate needs to be increased.").optional(),
  category: z.object({
    type: z.enum(['analysis', 'hypothesis', 'verification', 'revision', 'solution']).describe(`(Required) The type classification of this thought. Must be one of: 'analysis', 'hypothesis', 'verification', 'revision', 'solution'. See TOOL_DESCRIPTION for details on each stage and its requirements (e.g., 'revision' requires isRevision=true).`),
    confidence: z.number().min(0).max(1).describe(`(Required) Confidence score (0-1) reflecting the certainty/quality of this thought based on its type. See TOOL_DESCRIPTION for score interpretation guidelines.`),
    metadata: z.record(z.unknown()).describe("Optional object for additional stage-specific metadata (e.g., test parameters, evidence, focus areas).").optional()
  }).describe("(Required) Categorization for the current sequential thinking stage."),
  // Note: Top-level 'confidence' parameter removed as it was unused/confusing. Confidence is handled within the 'category' object.
  context: contextSchema.describe("Additional context (problem scope, assumptions, constraints) relevant to this thinking step or branch.").optional(),
  metrics: z.object({
    processingTime: z.number().min(0).describe("(Required) Processing time for the *previous* step in milliseconds."),
    resourceUsage: z.number().min(0).describe("(Required) Resource usage (e.g., memory in bytes) for the *previous* step."),
    dependencyChain: z.array(z.string()).describe("Tracks dependencies (e.g., 'Revises thought 2', 'Branch from thought 4').").optional(),
    dynamicAdaptation: z.object({
      confidenceThreshold: z.number().min(0).max(1).describe("Current adaptive confidence threshold being used by the service."),
      parallelProcessing: z.boolean().describe("Indicates if parallel processing is currently enabled by the service."),
      resourceOptimization: z.array(z.string()).describe("List of resource optimizations applied by the service in the previous step.").optional()
    }).describe("Information about dynamic adaptations made by the service in the previous step.").optional(),
    performanceMetrics: z.object({
      averageProcessingTime: z.number().min(0).describe("Average processing time across recent thoughts."),
      successRate: z.number().min(0).max(1).describe("Rate of recent thoughts meeting confidence thresholds."),
      branchingEfficiency: z.number().min(0).max(1).describe("Efficiency metric related to branching success.")
    }).describe("Overall performance metrics tracked by the service.").optional()
  }).describe("Metrics related to the processing of the *previous* thought; used by the service for adaptation. Provide if available from previous step's output.").optional()
};

// Tool description providing comprehensive usage guidance for LLMs.
export const TOOL_DESCRIPTION = `A powerful tool for dynamic and reflective problem-solving through structured, sequential thinking. Enables analysis, hypothesis generation, verification, revision, and branching.

**Core Functionality:**
Guides an iterative thinking process step-by-step. Each call represents one 'thought'. Manages state including thought numbers, branches, categories, and confidence. Supports dynamic adaptation based on progress and metrics.

**REQUIRED Parameters (MUST be provided in EVERY call):**
*   \`thought\`: (string) The content of the current thinking step.
*   \`nextThoughtNeeded\`: (boolean) Are more thinking steps required after this one?
*   \`thoughtNumber\`: (number) The sequential number of this thought within its branch (starts at 1).
*   \`totalThoughts\`: (number) The current estimated total thoughts needed for this sequence/branch.
*   \`category\`: (object) Categorization for the current stage (see details below).

**Key Parameter Rules & Relationships:**
*   **Category Object (Required):** This object MUST be provided.
    *   \`type\`: (enum) REQUIRED. Must be one of: 'analysis', 'hypothesis', 'verification', 'revision', 'solution'.
    *   \`confidence\`: (number 0-1) REQUIRED. Reflects certainty/quality. See interpretation below.
    *   \`metadata\`: (object) Optional. Additional stage-specific info.
*   **Conditional Requirements (CRITICAL):**
    *   If \`isRevision\` flag is set to \`true\`, then \`revisesThought\` (number) **MUST** also be provided and reference a thought number less than the current \`thoughtNumber\` within the same branch.
    *   If \`category.type\` is set to 'revision', then the \`isRevision\` flag (boolean) **MUST** be set to \`true\`.
    *   If starting a new branch (\`branchFromThought\` is provided), then \`branchId\` (string) **MUST** also be provided and be unique for the new branch. The first thought in a new branch should have \`thoughtNumber=1\`.
*   **Confidence Interpretation (\`category.confidence\`):**
    *   'analysis': Typically 0.5-0.7. < 0.4 insufficient, > 0.6 suggests readiness for 'hypothesis'.
    *   'hypothesis': Typically 0.3-0.8. < 0.6 weak, > 0.7 suggests readiness for 'verification'.
    *   'verification': Typically 0.6-0.9. < 0.8 inconclusive, > 0.9 suggests validation.
    *   'revision': Should generally be higher than the thought being revised.
    *   'solution': Requires >= 0.9.
*   **Deprecated Parameter:** The top-level optional \`confidence\` parameter is unused and **SHOULD NOT** be provided. Use \`category.confidence\` instead.
*   **Metrics Parameter:** The optional \`metrics\` object contains data *from the previous step's output*. Providing it helps the service perform dynamic adaptation.

**Suggested Workflow & Examples:**
1.  **Analysis:** Start with \`category.type='analysis'\`, \`thoughtNumber=1\`. Define the problem.
    \`\`\`json
    {
      "thought": "Analyzing system performance bottlenecks. Initial focus on database query times.",
      "nextThoughtNeeded": true,
      "thoughtNumber": 1, // Start at 1
      "totalThoughts": 5,
      "category": { "type": "analysis", "confidence": 0.6 } // Category REQUIRED
    }
    \`\`\`
2.  **Hypothesis:** Set \`category.type='hypothesis'\`. Propose a testable solution. Increment \`thoughtNumber\`.
    \`\`\`json
    {
      "thought": "Hypothesis: The main bottleneck is likely due to missing indexes on the 'orders' table.",
      "nextThoughtNeeded": true,
      "thoughtNumber": 2, // Increment
      "totalThoughts": 5,
      "category": { "type": "hypothesis", "confidence": 0.75 } // Category REQUIRED
    }
    \`\`\`
3.  **Verification:** Set \`category.type='verification'\`. Describe testing method. Increment \`thoughtNumber\`.
    \`\`\`json
    {
      "thought": "Verification plan: Use EXPLAIN ANALYZE on typical queries against 'orders' table. Check for full table scans.",
      "nextThoughtNeeded": true,
      "thoughtNumber": 3, // Increment
      "totalThoughts": 5,
      "category": { "type": "verification", "confidence": 0.8 } // Category REQUIRED
    }
    \`\`\`
4.  **Revision (if verification fails/inconclusive):** Set \`category.type='revision'\`, \`isRevision: true\`, provide \`revisesThought\`. Modify previous thought. Increment \`thoughtNumber\`.
    \`\`\`json
    {
      "thought": "Revision: Initial verification showed some slow queries, but not consistently table scans. Revising hypothesis to include potential locking issues.",
      "nextThoughtNeeded": true,
      "thoughtNumber": 4, // Increment
      "totalThoughts": 5, // May need to increase totalThoughts later
      "isRevision": true, // MUST be true for 'revision' category
      "revisesThought": 2, // MUST provide thought being revised
      "category": { "type": "revision", "confidence": 0.7 } // Category REQUIRED
    }
    \`\`\`
5.  **Solution (if verification succeeds):** Set \`category.type='solution'\`. State the validated solution. Increment \`thoughtNumber\`. Set \`nextThoughtNeeded=false\` if complete.
    \`\`\`json
    {
      "thought": "Solution: Adding indexes (index_orders_on_customer_id, index_orders_on_created_at) resolved the query performance bottleneck.",
      "nextThoughtNeeded": false, // Sequence complete
      "thoughtNumber": 4, // Increment
      "totalThoughts": 4, // Adjusted total
      "category": { "type": "solution", "confidence": 0.95 } // Category REQUIRED, high confidence
    }
    \`\`\`
6.  **Branching:** To explore an alternative, use \`branchFromThought\` and \`branchId\`. Start the new branch with \`thoughtNumber=1\`.
    \`\`\`json
    {
      "thought": "Alternative hypothesis: Could the bottleneck be network latency between app and DB?",
      "nextThoughtNeeded": true,
      "thoughtNumber": 1, // Start at 1 for the new branch
      "totalThoughts": 3, // Estimate for this branch
      "branchFromThought": 1, // Branching from the initial analysis
      "branchId": "network-latency-check", // MUST provide unique branch ID
      "category": { "type": "hypothesis", "confidence": 0.6 } // Category REQUIRED
    }
    \`\`\`

**Best Practices:**
*   Strictly adhere to the **REQUIRED Parameters** and **Conditional Requirements**.
*   Maintain accurate \`thoughtNumber\` sequence within each branch.
*   Ensure \`category.type\` matches the thinking stage and required flags (\`isRevision\`).
*   Use \`context\` to maintain focus, especially within branches.
*   Use \`branchFromThought\` and \`branchId\` correctly for parallel exploration.

**Error Handling:**
*   Invalid parameter combinations (e.g., \`isRevision=true\` without \`revisesThought\`) will cause errors.
*   Thoughts exceeding \`maxDepth\` (default 12) might be rejected.
*   Ensure \`category.confidence\` meets the guidelines for the stage.

This tool facilitates rigorous, step-by-step problem-solving and exploration of complex ideas.`;

// Note: Removed large comment blocks with parameter relationships, examples, etc.
// This information has been integrated into the TOOL_DESCRIPTION and Zod parameter descriptions above for better LLM accessibility.
