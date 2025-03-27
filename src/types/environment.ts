/**
 * Environment configuration interface for controlling metrics and logging
 */
export interface EnvironmentConfig {
    /**
     * Controls whether metrics collection is enabled
     * Default: true
     */
    ENABLE_METRICS: boolean;

    /**
     * Controls whether debug logging is enabled
     * Default: true
     */
    ENABLE_DEBUG_LOGGING: boolean;

    /**
     * Controls whether performance monitoring is enabled
     * Default: true
     */
    ENABLE_PERFORMANCE_MONITORING: boolean;

    /**
     * Controls whether error capture is enabled
     * Default: true
     */
    ENABLE_ERROR_CAPTURE: boolean;

    /**
     * Controls whether MCP debug mode is enabled
     * Default: false
     */
    ENABLE_MCP_DEBUG: boolean;

    /**
     * Controls whether cross-service optimization is enabled
     * Default: true
     */
    ENABLE_CROSS_SERVICE_OPTIMIZATION: boolean;

    /**
     * Controls whether adaptive processing is enabled
     * Default: true
     */
    ENABLE_ADAPTIVE_PROCESSING: boolean;

    /**
     * Controls whether error recovery is enabled
     * Default: true
     */
    ENABLE_ERROR_RECOVERY: boolean;
} 