import { z } from "zod";
import { contextSchema } from '../utils/index.js';

export const TOOL_NAME = "integratedThinking";

/* REQUIRED PARAMETERS EXPLAINED

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
*/

// Enhanced tool parameters schema
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
        type: z.enum(['initial', 'critique', 'revision', 'final']),
        confidence: z.number().min(0).max(1),
        metadata: z.record(z.unknown()).optional()
    }).describe("Categorization and metadata").optional(),
    confidence: z.number().min(0).max(1).describe("Confidence level").optional(),
    context: contextSchema.describe("Additional context for integrated processing").optional(),

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