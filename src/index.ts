import { createServer } from "./initialize.js";
import { join } from "path";
import { fileURLToPath } from "url";
import { logger } from "./utils/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { perspectiveAnalysisApi } from "./services/perspectiveAnalysisApi.js";
import {
    PerspectiveSchema,
    PerspectiveTypeSchema,
    StakeholderSchema,
    RequirementSchema,
    ConstraintSchema,
    PrioritySchema,
    PerspectiveMetadataSchema,
    CommonGroundSchema,
    DifferenceSchema,
    ConflictSchema,
    RecommendationSchema,
    SynthesisSchema,
    ComparisonMetricsSchema,
    ComparisonResultSchema,
    AnalysisConfigSchema,
    ComparisonConfigSchema,
    SynthesisConfigSchema,
    ValidationConfigSchema,
    type Perspective,
    type PerspectiveType,
    type Stakeholder,
    type Requirement,
    type Constraint,
    type Priority,
    type PerspectiveMetadata,
    type CommonGround,
    type Difference,
    type Conflict,
    type Recommendation,
    type Synthesis,
    type ComparisonMetrics,
    type ComparisonResult,
    type AnalysisConfig,
    type ComparisonConfig,
    type SynthesisConfig,
    type ValidationConfig
} from "./types/perspectiveAnalysis.js";
import {
    DefaultPerspectiveAnalysisService,
    DefaultPerspectiveOptimizationService,
    type PerspectiveAnalysisService,
    type PerspectiveOptimizationService
} from "./services/perspectiveAnalysis.js";
import {
    PerspectiveAnalysisApi,
    PerspectiveAnalysisError,
    type ValidationError as ApiValidationError,
    type OptimizationError
} from "./services/perspectiveAnalysisApi.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(fileURLToPath(import.meta.url), '..');

const server = createServer();

// Export the Perspective Analysis System
export {
    perspectiveAnalysisApi,
    PerspectiveSchema,
    PerspectiveTypeSchema,
    StakeholderSchema,
    RequirementSchema,
    ConstraintSchema,
    PrioritySchema,
    PerspectiveMetadataSchema,
    CommonGroundSchema,
    DifferenceSchema,
    ConflictSchema,
    RecommendationSchema,
    SynthesisSchema,
    ComparisonMetricsSchema,
    ComparisonResultSchema,
    AnalysisConfigSchema,
    ComparisonConfigSchema,
    SynthesisConfigSchema,
    ValidationConfigSchema,
    DefaultPerspectiveAnalysisService,
    DefaultPerspectiveOptimizationService,
    PerspectiveAnalysisApi,
    PerspectiveAnalysisError
};

export type {
    Perspective,
    PerspectiveType,
    Stakeholder,
    Requirement,
    Constraint,
    Priority,
    PerspectiveMetadata,
    CommonGround,
    Difference,
    Conflict,
    Recommendation,
    Synthesis,
    ComparisonMetrics,
    ComparisonResult,
    AnalysisConfig,
    ComparisonConfig,
    SynthesisConfig,
    ValidationConfig,
    PerspectiveAnalysisService,
    PerspectiveOptimizationService,
    ApiValidationError as ValidationError,
    OptimizationError
};

const main = async () => {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
    } catch (error) {
        logger.error("Failed to start server:", error);
    }
}

main();
