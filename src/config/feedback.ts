import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Configuration schema for feedback system
 */
const FeedbackConfigSchema = z.object({
    // Storage settings
    storage: z.object({
        type: z.enum(['memory', 'redis', 'postgres']).default('memory'),
        url: z.string().optional(),
        maxItems: z.number().default(1000),
        retentionDays: z.number().default(30)
    }),

    // Analysis settings
    analysis: z.object({
        minConfidence: z.number().min(0).max(1).default(0.6),
        maxPatterns: z.number().default(100),
        batchSize: z.number().default(50),
        parallelProcessing: z.boolean().default(true)
    }),

    // Optimization settings
    optimization: z.object({
        minWeight: z.number().min(0).max(1).default(0.1),
        maxWeight: z.number().min(0).max(1).default(1.0),
        adjustmentFactor: z.number().default(0.5),
        historySize: z.number().default(100)
    }),

    // Monitoring settings
    monitoring: z.object({
        enabled: z.boolean().default(true),
        interval: z.number().default(60000), // 1 minute
        metrics: z.array(z.string()).default([
            'confidence',
            'impact',
            'performance'
        ])
    })
});

// Parse environment variables or use defaults
const config = FeedbackConfigSchema.parse({
    storage: {
        type: process.env.FEEDBACK_STORAGE_TYPE || 'memory',
        url: process.env.FEEDBACK_STORAGE_URL,
        maxItems: parseInt(process.env.FEEDBACK_MAX_ITEMS || '1000', 10),
        retentionDays: parseInt(process.env.FEEDBACK_RETENTION_DAYS || '30', 10)
    },
    analysis: {
        minConfidence: parseFloat(process.env.FEEDBACK_MIN_CONFIDENCE || '0.6'),
        maxPatterns: parseInt(process.env.FEEDBACK_MAX_PATTERNS || '100', 10),
        batchSize: parseInt(process.env.FEEDBACK_BATCH_SIZE || '50', 10),
        parallelProcessing: process.env.FEEDBACK_PARALLEL_PROCESSING !== 'false'
    },
    optimization: {
        minWeight: parseFloat(process.env.FEEDBACK_MIN_WEIGHT || '0.1'),
        maxWeight: parseFloat(process.env.FEEDBACK_MAX_WEIGHT || '1.0'),
        adjustmentFactor: parseFloat(process.env.FEEDBACK_ADJUSTMENT_FACTOR || '0.5'),
        historySize: parseInt(process.env.FEEDBACK_HISTORY_SIZE || '100', 10)
    },
    monitoring: {
        enabled: process.env.FEEDBACK_MONITORING_ENABLED !== 'false',
        interval: parseInt(process.env.FEEDBACK_MONITORING_INTERVAL || '60000', 10),
        metrics: process.env.FEEDBACK_MONITORING_METRICS?.split(',') || [
            'confidence',
            'impact',
            'performance'
        ]
    }
});

// Export configuration type
export type FeedbackConfig = z.infer<typeof FeedbackConfigSchema>;

// Export validated configuration
export default config; 