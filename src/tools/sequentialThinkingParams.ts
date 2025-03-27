import { z } from "zod";
import { CoreConfig, EnhancementConfig, DebugConfig } from "../types/index.js";


export const TOOL_NAME = "sequentialThinking";

/* PARAMETERS EXPLAINED

Required Parameters:
------------------
- thought: Your current thinking step (REQUIRED)
  * Regular analytical steps (e.g., "Analyzing the root cause of the performance issue")
  * Revisions of previous thoughts (e.g., "Revising thought 2's approach based on new data")
  * Questions about previous decisions (e.g., "Should we reconsider the caching strategy?")
  * Realizations about needing more analysis (e.g., "Need to investigate memory usage patterns")
  * Changes in approach (e.g., "Switching to an event-driven architecture")
  * Hypothesis generation (e.g., "The latency might be caused by database connection pooling")
  * Hypothesis verification (e.g., "Testing the connection pooling hypothesis")
  * Error handling considerations (e.g., "Evaluating potential failure modes")
  * Performance optimizations (e.g., "Identifying bottlenecks in the current approach")

- nextThoughtNeeded: Boolean flag for continuation (REQUIRED)
  * true = More thinking steps needed
  * false = Current branch of thinking is complete
  * Note: Can be true even at what seemed like the end if new insights emerge
  * Used for flow control and branch management
  * Affects confidence calculations in subsequent thoughts

- thoughtNumber: Position in sequence (REQUIRED)
  * Starts at 1 and increments
  * Can go beyond initial totalThoughts if needed
  * Must be sequential within each branch
  * Used for dependency tracking and validation
  * Critical for confidence calculation context

- totalThoughts: Estimated total steps needed (REQUIRED)
  * Initial estimate that can be adjusted
  * Minimum value: 1
  * Can increase/decrease as analysis evolves
  * Affects resource allocation and parallel processing
  * Used in confidence threshold calculations

Optional Parameters:
------------------
- isRevision: Indicates thought revision
  * true = This thought revises a previous one
  * Must be used with revisesThought parameter
  * Helps track changes in thinking process
  * Affects confidence calculations
  * May trigger automatic threshold adjustments

- revisesThought: Target thought number for revision
  * Required when isRevision is true
  * Must reference an existing thought number
  * Example: revisesThought: 2 revises the second thought
  * Used for dependency tracking
  * Affects confidence inheritance

- branchFromThought: Starting point for new thinking branch
  * Used for parallel lines of thought
  * Must reference an existing thought number
  * Creates a new branch of analysis
  * Inherits confidence context from parent
  * Supports parallel processing when enabled

- branchId: Branch identifier
  * Required when branching
  * Format: string (e.g., "performance-analysis", "security-review")
  * Helps track parallel thought processes
  * Used in confidence context management
  * Critical for parallel execution

- needsMoreThoughts: Flag for extending analysis
  * true = Need to increase totalThoughts
  * Used when reaching the end but needing more steps
  * Triggers automatic adjustment of totalThoughts
  * May affect confidence thresholds
  * Influences resource allocation

- category: Thought classification and metadata
  * type: One of ['analysis', 'hypothesis', 'verification', 'revision', 'solution']
  * confidence: Number between 0-1 indicating certainty
  * metadata: Optional additional information
  * Helps with thought organization and tracking
  * Used in confidence calculations
  * Affects processing priority
  * Influences parallel execution decisions

- confidence: Certainty level
  * Range: 0-1 (0 = uncertain, 1 = certain)
  * Used for validation and decision making
  * Affects thought processing and branching
  * Calculated based on multiple factors:
    - Content Quality:
      * Structure analysis
      * Coherence scoring
      * Relevance to context
      * Length appropriateness
    - Processing Success:
      * Historical success rate
      * Error rate tracking
      * Performance trend analysis
      * Adaptation history
    - Context Relevance:
      * Keyword matching
      * Problem scope alignment
      * Historical context
      * Recent thought context
    - Resource Efficiency:
      * Memory usage optimization
      * Processing time tracking
      * Resource allocation
      * Performance metrics
  * Default thresholds:
    - Base: 0.6 (minimum for normal operation)
    - Critical: 0.4 (minimum with override)
    - Maximum: 0.95 (for high-confidence operations)
  * Adaptive based on:
    - Processing success rate
    - Resource efficiency
    - Context relevance
    - Content quality
    - Historical performance
    - Revision impact
    - Resource utilization

- context: Additional thought context
  * problemScope: Main focus area
  * assumptions: Array of underlying assumptions
  * constraints: Array of limitations/requirements
  * Helps maintain context across thoughts
  * Used in confidence calculations
  * Affects branching decisions
  * Influences parallel processing

Parameter Relationships:
---------------------
1. Revision Chain:
   - isRevision requires revisesThought
   - revisesThought must be < current thoughtNumber
   - Can't revise a thought from a different branch
   - Affects confidence inheritance
   - May trigger threshold adjustments

2. Branching Logic:
   - branchFromThought requires branchId
   - New branch inherits context from parent
   - Multiple branches can start from same thought
   - Parallel processing considerations:
     * Resource limits
     * Confidence thresholds
     * Context preservation
     * Error handling

3. Confidence Flow:
   - Lower confidence may trigger automatic revision
   - Higher confidence enables faster progression
   - Category confidence affects overall thought confidence
   - Confidence calculation components:
     * Content quality (40% weight)
       - Text structure analysis
       - Coherence scoring
       - Relevance matching
     * Revision impact (25% weight)
       - Content similarity
       - Length comparison
       - Improvement metrics
     * Historical performance (20% weight)
       - Success rate
       - Performance trend
       - Adaptation history
     * Resource efficiency (15% weight)
       - Memory utilization
       - Processing time
       - Resource optimization
   - Adaptive thresholds:
     * Base threshold adjusts based on chain progress
     * Minimum threshold enforced (0.4)
     * Maximum threshold capped (0.95)
     * Dynamic adjustment based on:
       - Success rate
       - Error patterns
       - Resource usage
       - Processing metrics

4. Context Inheritance:
   - Branches inherit parent context
   - Revisions inherit original thought's context
   - Context can be updated within branch
   - Affects confidence calculations
   - Influences processing decisions

Error Handling:
-------------
1. Validation Errors:
   - Invalid parameter combinations
   - Out-of-range values
   - Missing required dependencies
   - Resolution: Automatic correction or error response

2. Processing Errors:
   - Resource exhaustion
   - Timeout conditions
   - Integration failures
   - Resolution: Retry with adjusted parameters

3. Confidence Failures:
   - Below threshold results
   - Context mismatches
   - Resolution: 
     * Automatic revision
     * Critical override
     * Parameter adjustment

Performance Considerations:
------------------------
1. Resource Usage:
   - Memory management
   - Processing time limits
   - Parallel execution bounds
   - Adaptive resource allocation

2. Optimization:
   - Caching strategies
   - Context reuse
   - Confidence threshold adaptation
   - Branch pruning

Usage Examples:
-------------
1. Regular Thought:
   {
     thought: "Analyzing performance bottlenecks",
     thoughtNumber: 1,
     totalThoughts: 5,
     nextThoughtNeeded: true,
     category: { type: 'analysis', confidence: 0.8 },
     metrics: {
       processingTime: 150,
       resourceUsage: 52428800,  // 50MB
       dependencyChain: []
     }
   }

2. Revision with Critical Override:
   {
     thought: "Database indexing would be more effective than caching",
     thoughtNumber: 3,
     totalThoughts: 5,
     nextThoughtNeeded: true,
     isRevision: true,
     revisesThought: 2,
     category: { type: 'revision', confidence: 0.9 },
     confidence: 0.4,  // Using critical override
     context: {
       problemScope: "Performance Optimization",
       assumptions: ["High read load", "Limited memory"]
     },
     metrics: {
       processingTime: 200,
       resourceUsage: 78643200,  // 75MB
       dependencyChain: ["Revises thought 2"],
       dynamicAdaptation: {
         confidenceThreshold: 0.4,
         parallelProcessing: false,
         resourceOptimization: ["Reduced context window"]
       }
     }
   }

3. Parallel Branch with Resource Constraints:
   {
     thought: "Exploring alternative security measures",
     thoughtNumber: 1,
     totalThoughts: 3,
     nextThoughtNeeded: true,
     branchFromThought: 4,
     branchId: "security-analysis",
     category: { type: 'hypothesis', confidence: 0.7 },
     context: {
       constraints: ["Max memory: 1GB", "Response time < 100ms"]
     },
     metrics: {
       processingTime: 180,
       resourceUsage: 104857600,  // 100MB
       dependencyChain: ["Branch from thought 4"],
       performanceMetrics: {
         averageProcessingTime: 175,
         successRate: 0.85,
         branchingEfficiency: 0.9
       }
     }
   }
*/

// Enhanced tool parameters schema
export const TOOL_PARAMS = {
   thought: z.string().describe("Your current thinking step, which can include: * Regular analytical steps * Revisions of previous thoughts * Questions about previous decisions * Realizations about needing more analysis * Changes in approach * Hypothesis generation * Hypothesis verification * Error handling * Performance considerations"),
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
   }).describe("Additional context for the thought").optional(),
   metrics: z.object({
      processingTime: z.number().min(0).describe("Processing time in milliseconds"),
      resourceUsage: z.number().min(0).describe("Resource usage in bytes"),
      dependencyChain: z.array(z.string()).optional(),
      dynamicAdaptation: z.object({
         confidenceThreshold: z.number().min(0).max(1),
         parallelProcessing: z.boolean(),
         resourceOptimization: z.array(z.string()).optional()
      }).optional(),
      performanceMetrics: z.object({
         averageProcessingTime: z.number().min(0).describe("Average processing time in milliseconds"),
         successRate: z.number().min(0).max(1),
         branchingEfficiency: z.number().min(0).max(1)
      }).optional()
   }).describe("Metrics for the thought").optional()
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
- Integrated confidence management
- Resource-aware processing
- Error recovery mechanisms

Enhancement Features:
- Automatic thought summarization
- Thought categorization and metadata
- Progress tracking and metrics
- Dynamic strategy adaptation
- Confidence-based validation
- Performance optimization
- Resource monitoring
- Error detection and recovery

Processing Capabilities:
1. Thought Initialization
   - Problem scope analysis
   - Required thoughts estimation
   - Parameter optimization
   - Resource allocation
   - Confidence baseline

2. Advanced Processing
   - Parallel thought execution
   - Branch management
   - Dynamic adaptation
   - Context preservation
   - Resource optimization
   - Error handling
   - Performance monitoring

3. Quality Assurance
   - Confidence thresholds
   - Revision tracking
   - Performance monitoring
   - Error detection
   - Resource validation
   - Context verification
   - Result validation

4. Debug Features
   - Error capture and analysis
   - Metric tracking
   - Performance optimization
   - State validation
   - Resource monitoring
   - Context debugging
   - Confidence debugging

Usage Guidelines:
1. Start with clear problem definition
2. Utilize branching for complex scenarios
3. Monitor confidence levels
4. Track progress and metrics
5. Leverage parallel processing
6. Use revision system for refinement
7. Handle errors appropriately
8. Optimize resource usage
9. Monitor performance
10. Validate results

The tool maintains backward compatibility while providing enhanced capabilities for complex problem-solving scenarios.
Features integrated confidence handling with adaptive thresholds and validation.`;