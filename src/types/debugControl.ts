/**
 * Interface defining runtime debug control configuration
 * All flags default to false except metricTracking which defaults to true
 */
export interface RuntimeDebugControl {
    /** Controls error capture and logging functionality */
    errorCapture: boolean;

    /** Controls metric collection across services */
    metricTracking: boolean;

    /** Controls performance monitoring and optimization features */
    performanceMonitoring: boolean;

    /** Controls MCP-specific debug output */
    mcpDebug: boolean;
}

/** Type representing valid debug feature keys */
export type DebugFeature = keyof RuntimeDebugControl;

/** Callback type for debug state change notifications */
export type DebugChangeCallback = (newState: RuntimeDebugControl) => void; 