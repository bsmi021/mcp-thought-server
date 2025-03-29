import { z } from 'zod';

// Feedback Source Schema
export const FeedbackSourceSchema = z.object({
    id: z.string(),
    type: z.enum(['confidence', 'pattern', 'performance']),
    component: z.string(),
    priority: z.number()
});

// Feedback Type Schema
export const FeedbackTypeSchema = z.object({
    category: z.enum(['improvement', 'error', 'optimization']),
    severity: z.enum(['low', 'medium', 'high']),
    impact: z.number()
});

// Feedback Data Schema
export const FeedbackDataSchema = z.object({
    content: z.unknown(),
    metrics: z.record(z.string(), z.number()),
    context: z.record(z.string(), z.unknown())
});

// Feedback Schema
export const FeedbackSchema = z.object({
    id: z.string(),
    source: FeedbackSourceSchema,
    type: FeedbackTypeSchema,
    data: FeedbackDataSchema,
    metadata: z.record(z.string(), z.unknown()),
    timestamp: z.date()
});

// Analysis Pattern Schema
export const AnalysisPatternSchema = z.object({
    id: z.string(),
    type: z.string(),
    confidence: z.number(),
    data: z.unknown()
});

// Recommendation Schema
export const RecommendationSchema = z.object({
    id: z.string(),
    type: z.string(),
    priority: z.number(),
    description: z.string(),
    impact: z.number()
});

// Analysis Metrics Schema
export const AnalysisMetricsSchema = z.object({
    confidence: z.number(),
    impact: z.number(),
    performance: z.record(z.string(), z.number())
});

// Feedback Analysis Schema
export const FeedbackAnalysisSchema = z.object({
    patterns: z.array(AnalysisPatternSchema),
    recommendations: z.array(RecommendationSchema),
    metrics: AnalysisMetricsSchema
});

// Change Schema
export const ChangeSchema = z.object({
    id: z.string(),
    type: z.string(),
    data: z.unknown(),
    timestamp: z.date()
});

// Impact Assessment Schema
export const ImpactAssessmentSchema = z.object({
    confidence: z.number(),
    metrics: z.record(z.string(), z.number()),
    risks: z.array(z.string())
});

// Validation Result Schema
export const ValidationResultSchema = z.object({
    success: z.boolean(),
    metrics: z.record(z.string(), z.number()),
    issues: z.array(z.string())
});

// Feedback Application Schema
export const FeedbackApplicationSchema = z.object({
    changes: z.array(ChangeSchema),
    impact: ImpactAssessmentSchema,
    validation: ValidationResultSchema
});

// Export types
export type FeedbackSource = z.infer<typeof FeedbackSourceSchema>;
export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;
export type FeedbackData = z.infer<typeof FeedbackDataSchema>;
export type Feedback = z.infer<typeof FeedbackSchema>;
export type AnalysisPattern = z.infer<typeof AnalysisPatternSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type AnalysisMetrics = z.infer<typeof AnalysisMetricsSchema>;
export type FeedbackAnalysis = z.infer<typeof FeedbackAnalysisSchema>;
export type Change = z.infer<typeof ChangeSchema>;
export type ImpactAssessment = z.infer<typeof ImpactAssessmentSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type FeedbackApplication = z.infer<typeof FeedbackApplicationSchema>; 